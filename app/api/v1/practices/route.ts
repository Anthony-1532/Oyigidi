import type { NextRequest } from "next/server";
import { guard, guardLimited, ok, readJson } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { recordOversight } from "@/lib/coaching/context";
import { isEscalationMessage } from "@/lib/coaching/engine";
import { NotFoundError, num, optional, str, validateObject } from "@/lib/shared/validation";

/** Practices available to a coachee, with their own history. */
export const GET = async (request: NextRequest) =>
  guard(async () => {
    const person = await requireRole(request.headers, "client");
    const practices = repo.practices.listActive();
    return ok({
      practices: practices.map((practice) => ({ ...practice, steps: repo.practices.stepsFor(practice.id) })),
      completions: repo.practices.completionsFor(person.id),
    });
  });

/** Record a finished practice. A written reflection is optional: the point of
 *  the practice is the sitting, not the writing, so an empty one still counts.
 *  When there is one it also lands in the journal, where reflections already
 *  live, rather than becoming a second private store the coachee has to hunt
 *  through. */
export const POST = async (request: NextRequest) =>
  guardLimited(request, "mutation", async () => {
    const person = await requireRole(request.headers, "client");
    const body = await readJson(request);
    const input = validateObject(body, {
      practiceId: str(40),
      reflection: optional(str(8000, 1)),
      secondsPresent: num(0, 86_400),
    });

    const practice = repo.practices.listActive().find((p) => p.id === input.practiceId);
    if (!practice) throw new NotFoundError("Practice not found");

    const completion = repo.practices.complete({
      clientId: person.id,
      practiceId: practice.id,
      reflection: input.reflection,
      secondsPresent: Math.round(input.secondsPresent),
    });

    repo.progressEvents.append({
      clientId: person.id,
      eventType: "practice",
      title: `Completed a guided practice · ${practice.title}`,
      detail: practice.focus,
    });

    const entry = input.reflection
      ? repo.journals.insert({
          clientId: person.id,
          title: `Practice · ${practice.title}`,
          content: input.reflection,
        })
      : null;

    // A coachee can finish a practice without ever asking the coach to respond,
    // so the reflection is screened here too. Otherwise the quietest surface in
    // the product would be the one place a disclosure could pass unseen.
    const safetyFlag = input.reflection && isEscalationMessage(input.reflection) ? "escalation" : "none";
    if (safetyFlag === "escalation") {
      recordOversight({
        person,
        safetyFlag,
        summary: `SAFETY ESCALATION — flagged in a reflection saved from the practice "${practice.title}". Review promptly.`,
        escalationDetail: `Practice reflection matched escalation pattern during "${practice.title}".`,
        entityType: "practice",
        entityId: practice.id,
      });
    }

    return ok({ completion, journalEntry: entry, safetyFlag }, { status: 201 });
  });

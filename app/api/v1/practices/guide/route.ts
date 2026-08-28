import type { NextRequest } from "next/server";
import { guardLimited, ok, readJson } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { buildCoacheeContext, recordOversight } from "@/lib/coaching/context";
import { generateCoachingResponse } from "@/lib/coaching/engine";
import { NotFoundError, str, validateObject } from "@/lib/shared/validation";

/**
 * The coach responding inside a guided practice. Same engine, same context and
 * the same safety path as chat — an escalation short-circuits to the supportive
 * response and flags the session for review, wherever it was written.
 *
 * The prompt carries the practice and the step so the reply answers what was
 * actually asked, rather than treating the note as an opening chat message.
 */
export const POST = async (request: NextRequest) =>
  guardLimited(request, "chat", async () => {
    const person = await requireRole(request.headers, "client");
    const body = await readJson(request);
    const input = validateObject(body, {
      practiceId: str(40),
      stepId: str(40),
      note: str(4000, 1),
    });

    const practice = repo.practices.listActive().find((p) => p.id === input.practiceId);
    if (!practice) throw new NotFoundError("Practice not found");
    const step = repo.practices.stepsFor(practice.id).find((s) => s.id === input.stepId);
    if (!step) throw new NotFoundError("Practice step not found");

    const conversation = repo.conversations.ensure(person.id);
    const history = repo.messages.forConversation(conversation.id);

    const framed = `I am part-way through the guided practice "${practice.title}" (${practice.focus}). The step asks: "${step.title}" — ${step.body}\n\nWhat I wrote:\n${input.note}\n\nRespond briefly, in the moment, while I am still sitting with this. Reflect back what you notice and offer one question to stay with — do not hand me a task list.`;

    const result = await generateCoachingResponse({
      message: framed,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      context: buildCoacheeContext(person, `${input.note} ${practice.intention} ${step.title}`),
    });

    recordOversight({
      person,
      safetyFlag: result.safetyFlag,
      summary:
        result.safetyFlag === "escalation"
          ? `SAFETY ESCALATION — flagged during guided practice "${practice.title}". Immediate supportive response issued. Review promptly.`
          : `Guided practice "${practice.title}" · ${step.title}: ${input.note.slice(0, 100)}`,
      escalationDetail: `Practice reflection matched escalation pattern during "${practice.title}"; supportive response returned.`,
      entityType: "practice",
      entityId: practice.id,
    });

    return ok({ content: result.content, safetyFlag: result.safetyFlag, demoMode: result.demoMode });
  });

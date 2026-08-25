import type { NextRequest } from "next/server";
import { guard, guardLimited, ok, readJson } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo, audit } from "@/lib/db/store";
import { NotFoundError } from "@/lib/shared/validation";
import { num, oneOf, optional, str, validateObject } from "@/lib/shared/validation";

export const POST = async (request: NextRequest) =>
  guardLimited(request, "mutation", async () => {
    const person = await requireRole(request.headers, "client");
    const body = await readJson(request);
    const input = validateObject(body, {
      title: str(140, 3),
      description: optional(str(400)),
    });
    const goal = repo.goals.insert({ clientId: person.id, ...input, progressPercent: 0, status: "active" });
    audit(person.id, "goal_created", "goal", goal.id, goal.title);
    return ok({ goal }, { status: 201 });
  });

export const PATCH = async (request: NextRequest) =>
  guardLimited(request, "mutation", async () => {
    const person = await requireRole(request.headers, "client");
    const body = await readJson(request);
    const input = validateObject(body, {
      id: str(40),
      progressPercent: num(0, 100),
      status: oneOf(["active", "paused", "completed"] as const),
    });
    const existing = repo.goals.getOwned(person.id, input.id);
    if (!existing) throw new NotFoundError("Goal not found for this account");

    const goal = repo.goals.update(input.id, { progressPercent: input.progressPercent, status: input.status });
    if (input.status === "completed") {
      repo.progressEvents.append({ clientId: person.id, eventType: "goal_completed", title: `Goal completed: ${goal.title}` });
      audit(person.id, "goal_completed", "goal", goal.id, goal.title);
    } else {
      repo.progressEvents.append({ clientId: person.id, eventType: "goal_progress", title: `${goal.title} moved to ${goal.progressPercent}%` });
    }
    return ok({ goal });
  });

export const DELETE = async (request: NextRequest) =>
  guard(async () => {
    const person = await requireRole(request.headers, "client");
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!repo.goals.getOwned(person.id, id)) throw new NotFoundError("Goal not found for this account");
    repo.goals.remove(id);
    return ok({ removed: true });
  });

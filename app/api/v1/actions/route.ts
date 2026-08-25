import type { NextRequest } from "next/server";
import { guardLimited, ok, readJson } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { bool, NotFoundError, str, validateObject } from "@/lib/shared/validation";

/** Toggle a next-action's completion. */
export const PATCH = async (request: NextRequest) =>
  guardLimited(request, "mutation", async () => {
    const person = await requireRole(request.headers, "client");
    const body = await readJson(request);
    const input = validateObject(body, { id: str(40), completed: bool });
    const owned = repo.plans.listByClient(person.id).some((p) => p.id === input.id);
    if (!owned) throw new NotFoundError("Action not found for this account");
    const action = repo.plans.setCompleted(input.id, input.completed);
    if (input.completed) repo.progressEvents.append({ clientId: person.id, eventType: "action_completed", title: `Action completed: ${action.title}` });
    return ok({ action });
  });

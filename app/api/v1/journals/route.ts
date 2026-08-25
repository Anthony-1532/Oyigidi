import type { NextRequest } from "next/server";
import { guard, guardLimited, ok, readJson } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/session";
import { repo } from "@/lib/db/store";
import { NotFoundError } from "@/lib/shared/validation";
import { optional, str, validateObject } from "@/lib/shared/validation";

export const POST = async (request: NextRequest) =>
  guardLimited(request, "mutation", async () => {
    const person = await requireRole(request.headers, "client");
    const body = await readJson(request);
    const input = validateObject(body, {
      title: str(140, 1),
      content: str(8000, 2),
    });
    const entry = repo.journals.insert({ clientId: person.id, ...input });
    return ok({ entry }, { status: 201 });
  });

export const PATCH = async (request: NextRequest) =>
  guardLimited(request, "mutation", async () => {
    const person = await requireRole(request.headers, "client");
    const body = await readJson(request);
    const input = validateObject(body, {
      id: str(40),
      title: optional(str(140)),
      content: optional(str(8000, 2)),
    });
    const owned = repo.journals.listByClient(person.id).some((j) => j.id === input.id);
    if (!owned) throw new NotFoundError("Reflection not found for this account");
    const entry = repo.journals.update(input.id, { ...(input.title !== undefined && { title: input.title }), ...(input.content !== undefined && { content: input.content }) });
    return ok({ entry });
  });

export const DELETE = async (request: NextRequest) =>
  guard(async () => {
    const person = await requireRole(request.headers, "client");
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!repo.journals.listByClient(person.id).some((j) => j.id === id)) throw new NotFoundError("Reflection not found for this account");
    repo.journals.remove(id);
    return ok({ removed: true });
  });

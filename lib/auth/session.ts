// packages/auth — sessions and role authorization.
//
// DEMO BOUNDARY: authentication is mocked. The active identity is chosen via
// an httpOnly `oy_role` cookie (client | coach | admin), mirroring ochetoha's
// demo_role pattern so every workspace can be exercised without an external
// OAuth provider. Every authorization decision still happens server-side in
// `requireRole`; the UI only reflects the server's verdict. Production will
// swap `getSession` for verified session cookies + real provisioning.

import type { Person, Role } from "@/lib/shared/types";
import { repo } from "@/lib/db/store";

export const ROLE_COOKIE = "oy_role";
export const ROLES: readonly Role[] = ["client", "coach", "admin"];

const parseRole = (value: string | null | undefined): Role | null =>
  ROLES.includes(value as Role) ? (value as Role) : null;

const cookieValue = (headers: Headers, name: string): string | null => {
  const header = headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return rest.join("=");
  }
  return null;
};

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Resolve the signed-in person for the active demo role. */
export const getSession = async (headers: Headers): Promise<Person | null> => {
  const role = parseRole(cookieValue(headers, ROLE_COOKIE));
  if (!role) return null;
  const person = repo.people.list().find((p) => p.role === role && p.accountStatus === "active");
  return person ?? null;
};

export const requirePerson = async (headers: Headers): Promise<Person> => {
  const person = await getSession(headers);
  if (!person) throw new ForbiddenError("Sign in to continue");
  return person;
};

/** Server-side gate. Callsites must never rely on hiding UI alone. */
export const requireRole = async (headers: Headers, ...allowed: Role[]): Promise<Person> => {
  const person = await requirePerson(headers);
  if (!allowed.includes(person.role)) throw new ForbiddenError(`This action requires the ${allowed.join(" or ")} role`);
  return person;
};

export const roleHome: Record<Role, string> = {
  client: "/client",
  coach: "/coach",
  admin: "/admin",
};

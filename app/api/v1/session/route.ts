import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { guard, guardLimited, ok, readJson } from "@/lib/api/http";
import { getSession, ROLE_COOKIE, ROLES } from "@/lib/auth/session";
import { oneOf, validateObject } from "@/lib/shared/validation";

/** Current demo identity + the identities available to explore with. */
export const GET = async (request: NextRequest) =>
  guard(async () => {
    const person = await getSession(request.headers);
    return ok({
      person,
      availableRoles: ROLES,
      demoMode: true,
      aiConfigured: Boolean(process.env.BUILT_IN_FORGE_API_KEY),
    });
  });

/** Switch the active demo role (httpOnly cookie). */
export const POST = async (request: NextRequest) =>
  guardLimited(request, "session", async () => {
    const body = await readJson(request);
    const { role } = validateObject(body, { role: oneOf(ROLES) });
    const store = await cookies();
    store.set(ROLE_COOKIE, role, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    return ok({ role });
  });

/** Sign out. */
export const DELETE = async () =>
  guard(async () => {
    const store = await cookies();
    store.delete(ROLE_COOKIE);
    return ok({ signedOut: true });
  });

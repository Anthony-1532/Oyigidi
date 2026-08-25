import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ROLE_COOKIE } from "@/lib/auth/session";

/** Clear the demo session and return to the landing page. */
export async function GET(request: NextRequest) {
  const store = await cookies();
  store.delete(ROLE_COOKIE);
  return NextResponse.redirect(new URL("/", request.url));
}

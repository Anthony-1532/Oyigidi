// API boundary helpers — consistent JSON envelope, error handling, request IDs.
// Ported from the ochetoha pattern.

import { NextResponse, type NextRequest } from "next/server";
import { newRequestId, ValidationError } from "@/lib/shared/validation";
import { ForbiddenError } from "@/lib/auth/session";
import { checkRateLimit, clientIp, type RateLimitBucket } from "@/lib/security/rate-limit";

export const ok = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json(
    { data, requestId: newRequestId() },
    { ...init, headers: { "x-request-id": newRequestId(), ...(init?.headers ?? {}) } },
  );

export const fail = (status: number, code: string, message: string, details?: unknown) =>
  NextResponse.json(
    { error: { code, message, details }, requestId: newRequestId() },
    { status, headers: { "x-request-id": newRequestId() } },
  );

const handleError = (err: unknown): NextResponse => {
  if (err instanceof ValidationError) return fail(422, "validation_error", err.message, err.details);
  if (err instanceof ForbiddenError) return fail(403, "forbidden", err.message);
  if (err instanceof Error && err.name === "NotFound") return fail(404, "not_found", err.message);
  if (err instanceof Error && err.name === "Conflict") return fail(409, "conflict", err.message);
  console.error("[api] unhandled", err);
  return fail(500, "internal_error", "An unexpected error occurred");
};

export const guard = (fn: () => unknown): NextResponse | Promise<NextResponse> => {
  try {
    const out = fn() as NextResponse | Promise<NextResponse>;
    return out instanceof Promise ? out.catch(handleError) : out;
  } catch (err) {
    return handleError(err);
  }
};

/** Guard with backend rate limiting before the handler runs. */
export const guardLimited = (request: NextRequest, bucket: RateLimitBucket, fn: () => unknown): NextResponse | Promise<NextResponse> => {
  const result = checkRateLimit(clientIp(request.headers), bucket);
  if (!result.ok) {
    const res = fail(429, "rate_limited", "Too many requests, try again later");
    res.headers.set("Retry-After", String(result.retryAfterSeconds));
    return res;
  }
  return guard(fn);
};

export const readJson = async (request: NextRequest): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw new ValidationError({ $root: "Expected a JSON body" });
  }
};

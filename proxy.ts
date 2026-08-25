// Request boundary — CSP with per-request nonce plus rate limiting.
// Mirrors the ochetoha proxy pattern.

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientIp, type RateLimitBucket } from "@/lib/security/rate-limit";

const MAX_MUTATION_BODY_BYTES = 512 * 1024;
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const bucketForPath = (pathname: string): RateLimitBucket => {
  if (pathname.startsWith("/api/v1/chat")) return "chat";
  if (pathname.startsWith("/api/v1/session")) return "session";
  if (pathname.startsWith("/api/v1/admin") || pathname.startsWith("/api/v1/coach")) return "write";
  return "mutation";
};

const tooMany = (retryAfterSeconds: number): NextResponse =>
  NextResponse.json({ error: { code: "rate_limited", message: "Too many requests, try again later" } }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (MUTATION_METHODS.has(request.method)) {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_MUTATION_BODY_BYTES) {
      return NextResponse.json({ error: { code: "payload_too_large", message: "Request body too large" } }, { status: 413 });
    }
    const limited = checkRateLimit(clientIp(request.headers), bucketForPath(pathname));
    if (!limited.ok) return tooMany(limited.retryAfterSeconds);
  }
  if (pathname.startsWith("/api/")) {
    const global = checkRateLimit(clientIp(request.headers), "global");
    if (!global.ok) return tooMany(global.retryAfterSeconds);
  }

  const isDev = process.env.NODE_ENV === "development";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

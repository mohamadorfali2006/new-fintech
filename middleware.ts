import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  hashKey,
  rateLimitedResponse,
} from "@/lib/rate-limit";

// Auth.js v5 (NextAuth) session cookie names: plaintext http (dev) plus
// the __Secure- / __Host- prefixed variants used over https (prod).
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
];

// Routes reachable without a session. Everything else requires one.
const PUBLIC_PATHS = new Set(["/", "/login", "/register"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // NextAuth flow + public auth endpoints (sign-in / registration must
  // work while logged out).
  if (pathname.startsWith("/api/auth")) return true;
  return false;
}

function hasSession(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ADDITIVE Phase-2: fixed-window rate limits on sensitive POSTs, enforced
  // here (edge) so they return real 429 + Retry-After JSON. Runs before the
  // public-path gate on purpose: login/reset/AI abuse must be throttled
  // whether or not a session cookie is present. Best-effort per-isolate
  // memory (see lib/rate-limit.ts prod TODO); route-level checks in
  // register/reset + per-account throttle in authorize() are the other
  // layers. Nothing below this block was changed.
  if (request.method === "POST") {
    // Credentials sign-in posts to /api/auth/callback/credentials.
    if (pathname === "/api/auth/callback/credentials") {
      const rl = checkRateLimit(
        `login:${getClientIp(request)}`,
        10,
        15 * 60 * 1000
      );
      if (!rl.allowed)
        return rateLimitedResponse(
          rl.retryAfterSec,
          "Too many login attempts. Try again later."
        );
    } else if (pathname === "/api/ai/chat") {
      // Key on a hash of the session cookie (never the raw token) so one
      // user can't burn the shared IP bucket; fall back to IP when logged
      // out (the 401 gate below still applies).
      const sessionCookie = SESSION_COOKIES.map(
        (name) => request.cookies.get(name)?.value
      ).find(Boolean);
      const identity = sessionCookie
        ? `ai-session:${hashKey(sessionCookie)}`
        : `ai-ip:${getClientIp(request)}`;
      const rl = checkRateLimit(identity, 30, 60 * 1000);
      if (!rl.allowed)
        return rateLimitedResponse(
          rl.retryAfterSec,
          "Too many AI requests. Try again later."
        );
    }
  }

  if (isPublicPath(pathname)) {
    // Logged-in users don't need the auth pages again.
    if (
      (pathname === "/login" || pathname === "/register") &&
      hasSession(request)
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession(request)) {
    // API routes get JSON 401 (same shape as handler-level auth checks);
    // pages get redirected to login. Handler-level auth() calls remain the
    // authoritative check — this cookie-presence gate is defense in depth.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

import { NextRequest } from "next/server";

const MIDDLEWARE_SECRET = process.env.MIDDLEWARE_SECRET || "dev-middleware-secret-change-in-prod";

export function middleware(request: NextRequest) {
  return NextResponse.rewrite(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};

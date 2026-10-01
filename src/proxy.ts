import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const publicPaths = ["/account/login", "/account/register", "/account/forgot", "/account/reset", "/account/verify"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.some((path) => pathname === path)) return NextResponse.next();
  if ((pathname.startsWith("/admin") || pathname.startsWith("/account")) && !getSessionCookie(request)) {
    const url = new URL("/account/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};

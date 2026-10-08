import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { cacheControlFor, isPublicAsset } from "@/lib/cache-policy";

const publicPaths = ["/account/login", "/account/register", "/account/forgot", "/account/reset", "/account/verify"];

function fresh(response: NextResponse, pathname: string) {
  if (isPublicAsset(pathname)) return response;
  response.headers.set("Cache-Control", cacheControlFor(pathname, process.env.NODE_ENV));
  if (process.env.NODE_ENV !== "production" && !pathname.startsWith("/account") && !pathname.startsWith("/admin") && !pathname.startsWith("/api/")) {
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.some((path) => pathname === path)) return fresh(NextResponse.next(), pathname);
  if ((pathname.startsWith("/admin") || pathname.startsWith("/account")) && !getSessionCookie(request)) {
    const url = new URL("/account/login", request.url);
    url.searchParams.set("next", pathname);
    return fresh(NextResponse.redirect(url), pathname);
  }
  return fresh(NextResponse.next(), pathname);
}

export const config = {
  matcher: ["/((?!_next/image|favicon.ico).*)"],
};

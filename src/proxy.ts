import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const publicPaths = ["/account/login", "/account/register", "/account/forgot", "/account/reset", "/account/verify"];

function fresh(response: NextResponse) {
  if (process.env.NODE_ENV === "production") return response;
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.some((path) => pathname === path)) return fresh(NextResponse.next());
  if ((pathname.startsWith("/admin") || pathname.startsWith("/account")) && !getSessionCookie(request)) {
    const url = new URL("/account/login", request.url);
    url.searchParams.set("next", pathname);
    return fresh(NextResponse.redirect(url));
  }
  return fresh(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/image|favicon.ico).*)"],
};

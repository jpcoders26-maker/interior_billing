import { NextResponse } from "next/server";
import { COOKIE, verifyToken } from "./lib/server/jwt.js";

const PUBLIC = ["/login"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // auth endpoints are always reachable
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  const session = await verifyToken(token);
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // unauthenticated -> bounce to /login (api gets 401)
  if (!session && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // already authed but visiting /login -> go home
  if (session && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // run on everything except next internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

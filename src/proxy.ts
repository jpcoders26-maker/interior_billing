// Renamed from middleware.js to proxy.ts per the Next.js 16 convention (see
// docs/ARCHITECTURE-AUDIT.md §4.1). Runs on every request that isn't a
// static asset: auth gate, rate limiting, and a defense-in-depth CSRF check.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "@/lib/server/jwt";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

const PUBLIC_PAGES = ["/login"];
const PUBLIC_API = ["/api/auth", "/api/health", "/api/ready"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Defense-in-depth CSRF check (Phase 15). The httpOnly, SameSite=Lax session
 * cookie already stops the classic cross-site form/fetch CSRF case for a
 * same-origin JSON API — SameSite=Lax cookies aren't attached to cross-site
 * POST/PUT/DELETE fetches or form submissions. This adds an explicit
 * Origin/Sec-Fetch-Site check on every mutating request as a second layer,
 * since "SameSite alone" is exactly what Phase 15 says not to rely on.
 */
function isSameOriginMutation(req: NextRequest): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite) return secFetchSite === "same-origin" || secFetchSite === "none";

  // Older browsers without Sec-Fetch-Site: fall back to Origin vs Host.
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from same-origin pages may omit Origin; SameSite cookie is still the primary defense
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/api/health" || pathname === "/api/ready") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const ip = clientIp(req);
    const isAuthRoute = pathname.startsWith("/api/auth/");
    const limit = await rateLimit({
      key: isAuthRoute ? `auth:${ip}` : `api:${ip}`,
      limit: isAuthRoute ? 10 : 120,
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests — please slow down" }, { status: 429 });
    }

    if (MUTATING_METHODS.has(req.method) && !isSameOriginMutation(req)) {
      return NextResponse.json({ error: "Cross-site request rejected" }, { status: 403 });
    }
  }

  if (isPublicApi(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  const session = await verifyToken(token);
  const isPublicPage = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!session && !isPublicPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && isPublicPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

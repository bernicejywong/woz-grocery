import { NextResponse, type NextRequest } from "next/server";
 
const COOKIE_NAME = "woz_auth";
const PUBLIC_PATHS = ["/login", "/api/login"];
 
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
 
  // allow Next internals/static
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return NextResponse.next();
  }
 
  // allow login routes
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }
 
  const token = req.cookies.get(COOKIE_NAME)?.value;
 
  if (token !== "1") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (req.nextUrl.search || ""));
    return NextResponse.redirect(url);
  }
 
  return NextResponse.next();
}
 
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
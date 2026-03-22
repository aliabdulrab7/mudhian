import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/seed"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  // Branch users: own branch only
  if (user.role === "branch") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/reports")) {
      return NextResponse.redirect(new URL(`/branch/${user.branchId}/drawer`, req.url));
    }
    const branchMatch = pathname.match(/^\/branch\/(\d+)/);
    if (branchMatch && parseInt(branchMatch[1]) !== user.branchId) {
      return NextResponse.redirect(new URL(`/branch/${user.branchId}/drawer`, req.url));
    }
    if (pathname === "/" || pathname === "/dashboard") {
      return NextResponse.redirect(new URL(`/branch/${user.branchId}/drawer`, req.url));
    }
  }

  // Viewer users: can see all branches (read-only) + dashboard + reports, block admin
  if (user.role === "viewer") {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/seed"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Branch users can only access their own branch
  if (user.role === "branch") {
    // Block admin routes
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL(`/branch/${user.branchId}/drawer`, req.url));
    }
    // Block other branches
    const branchMatch = pathname.match(/^\/branch\/(\d+)/);
    if (branchMatch && parseInt(branchMatch[1]) !== user.branchId) {
      return NextResponse.redirect(new URL(`/branch/${user.branchId}/drawer`, req.url));
    }
    // Redirect dashboard to their branch
    if (pathname === "/" || pathname === "/dashboard") {
      return NextResponse.redirect(new URL(`/branch/${user.branchId}/drawer`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

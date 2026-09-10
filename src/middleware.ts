import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "surya_session";
const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "hotelsurya-production-secure-key-2026-auth"
);

// Public paths that do not require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return !!payload?.id;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, Next internals, icons, and fonts
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/images") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const authed = await isAuthenticated(request);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path);

  // If user is already authenticated and visits /login, redirect to /
  if (authed && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is NOT authenticated and trying to access any other path
  if (!authed && !isPublicPath) {
    // If it's an API route, return 401 Unauthorized JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    // For all page routes, redirect immediately to /login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

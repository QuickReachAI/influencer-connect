import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/signup",
  "/browse",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/inngest",
  "/api/oauth/instagram/callback",
  "/api/oauth/youtube/callback",
  "/api/influencers",
  "/api/pusher/auth",
  "/api/campaigns",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for auth cookie on protected routes
  const userId = request.cookies.get("user_id")?.value;

  if (!userId && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!userId && pathname.startsWith("/api/") && !isPublicPath(pathname)) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

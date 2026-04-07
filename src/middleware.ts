import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function middleware(request: NextRequest) {
  const authRes = await auth0.middleware(request);

  // If Auth0 handled it (login/callback/logout routes), return that response
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return authRes;
  }

  // Protect the /agent route — redirect to login if no session
  if (request.nextUrl.pathname.startsWith("/agent")) {
    const session = await auth0.getSession(request);
    if (!session) {
      return NextResponse.redirect(
        new URL("/auth/login?returnTo=/agent", request.url)
      );
    }
  }

  return authRes || NextResponse.next();
}

export const config = {
  matcher: ["/auth/:path*", "/agent/:path*", "/api/:path*"],
};

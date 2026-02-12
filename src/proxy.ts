import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const USER_COOKIE_NAME = "session_token";
const SYSADMIN_COOKIE_NAME = "sysadmin_token";

export function proxy(request: NextRequest) {
  const hasUserCookie = request.cookies.get(USER_COOKIE_NAME);
  const hasSysadminCookie = request.cookies.get(SYSADMIN_COOKIE_NAME);

  if (!hasUserCookie && !hasSysadminCookie) {
    const loginUrl = new URL("/login?type=user", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

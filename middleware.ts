import { type NextRequest, NextResponse } from "next/server";
import { isPrivateBetaBlockedPath, isPrivateBetaEnabled } from "@/lib/private-beta";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (isPrivateBetaEnabled() && isPrivateBetaBlockedPath(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return await createClient(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

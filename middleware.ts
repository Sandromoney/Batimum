import { type NextRequest, NextResponse } from "next/server";
import { isPrivateBetaBlockedPath, isPrivateBetaEnabled } from "@/lib/private-beta";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    if (
      isPrivateBetaEnabled() &&
      isPrivateBetaBlockedPath(request.nextUrl.pathname)
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return await createClient(request);
  } catch (error) {
    console.error("[middleware]", error);
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
}

export const config = {
  matcher: [
    "/((?!_next|api|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

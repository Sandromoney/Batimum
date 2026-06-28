import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { emailProviderService } from "@/lib/email-provider";
import { EMAIL_OAUTH_COOKIE } from "@/lib/email-provider/token-cookie";

export async function GET() {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(EMAIL_OAUTH_COOKIE)?.value;
  return NextResponse.json(emailProviderService.getConnectionStatus(sealed));
}

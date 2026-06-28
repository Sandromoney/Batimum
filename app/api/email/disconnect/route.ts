import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EMAIL_OAUTH_COOKIE } from "@/lib/email-provider/token-cookie";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(EMAIL_OAUTH_COOKIE);
  return NextResponse.json({ success: true });
}

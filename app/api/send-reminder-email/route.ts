import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { emailProviderService } from "@/lib/email-provider";
import {
  EMAIL_OAUTH_COOKIE,
  sealEmailOAuthTokens,
} from "@/lib/email-provider/token-cookie";

type SendEmailPayload = {
  destinataire?: string;
  objet?: string;
  message?: string;
  html?: string;
  pdfBase64?: string;
  pdfFilename?: string;
  replyToEmail?: string;
  allowFallback?: boolean;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as SendEmailPayload;

  if (!payload.destinataire || !payload.objet || !payload.message) {
    return NextResponse.json(
      { success: false, message: "Email incomplet." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const sealed = cookieStore.get(EMAIL_OAUTH_COOKIE)?.value;

  const result = await emailProviderService.send(
    {
      from: "",
      to: payload.destinataire,
      subject: payload.objet,
      text: payload.message,
      html: payload.html,
      replyTo: payload.replyToEmail,
      attachments:
        payload.pdfBase64 && payload.pdfFilename
          ? [
              {
                filename: payload.pdfFilename,
                contentBase64: payload.pdfBase64,
                mimeType: "application/pdf",
              },
            ]
          : undefined,
    },
    {
      sealedTokens: sealed,
      allowFallback: payload.allowFallback ?? false,
      replyToEmail: payload.replyToEmail,
    },
  );

  if (result.refreshedTokens) {
    cookieStore.set(
      EMAIL_OAUTH_COOKIE,
      sealEmailOAuthTokens(result.refreshedTokens),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
      },
    );
  }

  if (!result.ok) {
    const expired = result.message.includes("expiré");
    return NextResponse.json(
      {
        success: false,
        expired,
        message: result.message,
      },
      { status: expired ? 401 : 502 },
    );
  }

  return NextResponse.json({
    success: true,
    simulated: result.simulated ?? false,
    provider: result.provider,
    message: result.message,
  });
}

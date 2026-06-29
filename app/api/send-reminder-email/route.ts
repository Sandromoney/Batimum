import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateEmailConnectionTokens } from "@/lib/email-connection-store";
import { emailProviderService } from "@/lib/email-provider";
import { resolveEmailOAuthTokens } from "@/lib/email-provider/resolve-tokens";
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
  const cookieSealed = cookieStore.get(EMAIL_OAUTH_COOKIE)?.value;
  const { tokens: resolvedTokens, sealed, userId } =
    await resolveEmailOAuthTokens(cookieSealed);

  if (!sealed && resolvedTokens) {
    cookieStore.set(EMAIL_OAUTH_COOKIE, sealEmailOAuthTokens(resolvedTokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }

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
      sealedTokens: sealed ?? cookieSealed,
      allowFallback: payload.allowFallback ?? false,
      replyToEmail: payload.replyToEmail,
    },
  );

  if (result.refreshedTokens) {
    const refreshedSealed = sealEmailOAuthTokens(result.refreshedTokens);
    cookieStore.set(EMAIL_OAUTH_COOKIE, refreshedSealed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });

    if (userId) {
      try {
        await updateEmailConnectionTokens(userId, result.refreshedTokens);
      } catch {
        /* garde le cookie à jour même si Supabase échoue */
      }
    }
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

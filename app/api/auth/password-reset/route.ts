import { NextResponse } from "next/server";
import { sendViaResendFallback } from "@/lib/email-provider/adapters/resend-fallback";
import { buildPasswordResetEmail } from "@/lib/email/batimum-transactional-templates";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/**
 * Envoie un email Batimum de réinitialisation (Resend) via lien de recovery Supabase.
 * Ne révèle jamais si l'email existe.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Requête invalide." },
      { status: 400 },
    );
  }

  const email =
    body && typeof body === "object"
      ? String((body as { email?: unknown }).email ?? "")
          .trim()
          .toLowerCase()
      : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { success: false, message: "Email invalide." },
      { status: 400 },
    );
  }

  const origin =
    request.headers.get("origin")?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3006";

  const redirectTo = `${origin.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent("/reinitialiser-mot-de-passe")}`;

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        message: "Service indisponible. Réessayez plus tard.",
      },
      { status: 503 },
    );
  }

  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    const actionLink =
      data?.properties?.action_link?.trim() ||
      (data as { action_link?: string } | null)?.action_link?.trim();

    if (!error && actionLink) {
      const content = buildPasswordResetEmail({
        resetUrl: actionLink,
        expiresMinutes: 60,
      });
      const sent = await sendViaResendFallback({
        from: "",
        to: email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });

      if (!sent.ok && !(process.env.NODE_ENV === "development" && sent.simulated)) {
        console.error("[password-reset] Resend failed", sent.message);
        // Fallback : laisse Supabase envoyer son email natif
        await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      }
    }
  } catch (error) {
    console.error("[password-reset]", error);
  }

  return NextResponse.json({
    success: true,
    message:
      "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.",
  });
}

import { sendViaResendFallback } from "@/lib/email-provider/adapters/resend-fallback";
import {
  buildVerificationEmailHtml,
  buildVerificationEmailText,
  VERIFICATION_EMAIL_SUBJECT,
} from "@/lib/email-verification/verification-email-template";

export async function sendVerificationCodeEmail(
  email: string,
  code: string,
): Promise<{ ok: boolean; message: string }> {
  const result = await sendViaResendFallback({
    from: "",
    to: email,
    subject: VERIFICATION_EMAIL_SUBJECT,
    text: buildVerificationEmailText(code),
    html: buildVerificationEmailHtml(code),
  });

  if (!result.ok) {
    console.error(
      `[email-verification] Erreur Resend : ${result.message || "échec inconnu"}`,
    );

    if (process.env.NODE_ENV === "development" && result.simulated) {
      console.warn(
        `[email-verification] Aucun email envoyé à ${email} — configurez RESEND_API_KEY et EMAIL_FROM dans .env.local, puis redémarrez npm run dev.`,
      );
      return { ok: true, message: "Code généré (mode développement)." };
    }

    return {
      ok: false,
      message:
        result.message ||
        "Impossible d'envoyer l'email de vérification pour le moment.",
    };
  }

  return { ok: true, message: "Code de vérification envoyé." };
}

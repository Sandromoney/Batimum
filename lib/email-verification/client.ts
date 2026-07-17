export type EmailVerificationApiResult = {
  ok: boolean;
  message: string;
};

function resolveClientFetchUrl(path: string): string {
  if (typeof window !== "undefined") {
    return path;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return appUrl ? `${appUrl}${path}` : path;
}

async function postEmailVerification(
  path: string,
  body: { email: string; code?: string },
): Promise<EmailVerificationApiResult> {
  const url = resolveClientFetchUrl(path);

  if (typeof window !== "undefined") {
    console.info(`[email-verification][client] URL appelée par le front : ${url}`);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as EmailVerificationApiResult;
    if (!response.ok) {
      if (typeof window !== "undefined") {
        console.error(
          `[email-verification][client] Réponse API ${response.status} : ${payload.message || "erreur inconnue"}`,
        );
      }
      return {
        ok: false,
        message: payload.message || "Une erreur est survenue.",
      };
    }

    return payload;
  } catch (error) {
    if (typeof window !== "undefined") {
      console.error("[email-verification][client] Échec fetch :", error);
    }
    return {
      ok: false,
      message: "Impossible de contacter le serveur de vérification.",
    };
  }
}

export function sendEmailVerificationCode(email: string) {
  return postEmailVerification("/api/auth/email-verification/send", { email });
}

export function verifyEmailVerificationCode(email: string, code: string) {
  return postEmailVerification("/api/auth/email-verification/verify", {
    email,
    code,
  });
}

export function resendEmailVerificationCode(email: string) {
  return postEmailVerification("/api/auth/email-verification/resend", { email });
}

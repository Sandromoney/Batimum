export const CGU_CGV_VERSION = "2026-06-11";

export const TERMS_ACCEPTANCE_REQUIRED_MESSAGE =
  "Veuillez accepter les CGU et les CGV avant de continuer.";

export type LegalAcceptance = {
  cguAccepted: true;
  cgvAccepted: true;
  acceptedAt: string;
  acceptedIp?: string;
  acceptedVersion: string;
};

export function createLegalAcceptance(acceptedIp?: string): LegalAcceptance {
  return {
    cguAccepted: true,
    cgvAccepted: true,
    acceptedAt: new Date().toISOString(),
    acceptedIp: acceptedIp?.trim() || undefined,
    acceptedVersion: CGU_CGV_VERSION,
  };
}

export async function recordTermsAcceptance(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/terms-acceptance", {
      method: "POST",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchRecordedTermsAcceptance(): Promise<LegalAcceptance | null> {
  try {
    const response = await fetch("/api/auth/terms-acceptance", {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as LegalAcceptance;
  } catch {
    return null;
  }
}

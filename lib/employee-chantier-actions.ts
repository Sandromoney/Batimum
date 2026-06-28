import type { Chantier, Client } from "@/lib/types";

export function normalizePhoneForTel(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  return trimmed.replace(/\D/g, "");
}

export function formatPhoneDisplay(phone: string): string {
  return phone.trim();
}

export function getGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

export function getWazeUrl(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address.trim())}&navigate=yes`;
}

export function isMobileCallDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return mobileUa || (coarsePointer && window.innerWidth < 1024);
}

/** Construit l'adresse complète chantier (rue + CP + ville). */
export function buildChantierFullAddress(
  chantier?: Pick<Chantier, "adresse">,
  client?: Pick<Client, "codePostal" | "ville">,
): string {
  const street = chantier?.adresse?.trim() ?? "";
  if (!street) return "";

  if (/\b\d{5}\b/.test(street)) {
    return street;
  }

  const codePostal = client?.codePostal?.trim();
  const ville = client?.ville?.trim();
  if (codePostal && ville) {
    return `${street}, ${codePostal} ${ville}`;
  }

  return street;
}

/** Vérifie rue + numéro + code postal + ville pour la navigation GPS. */
export function isCompleteChantierAddress(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed) return false;

  if (!/\d/.test(trimmed)) return false;

  const postalMatch = trimmed.match(/\b(\d{5})\b/);
  if (!postalMatch) return false;

  const postalIndex = trimmed.indexOf(postalMatch[1]);
  const streetPart = trimmed.slice(0, postalIndex).replace(/[,.\s-]+$/, "").trim();
  if (!/[a-zA-ZÀ-ÿ]{2,}/.test(streetPart)) return false;

  const cityPart = trimmed
    .slice(postalIndex + 5)
    .replace(/^[,.\s-]+/, "")
    .trim();
  if (cityPart.length < 2 || !/[a-zA-ZÀ-ÿ]/.test(cityPart)) return false;

  return true;
}

export function getChantierNavigationAddress(
  chantier?: Pick<Chantier, "adresse">,
  client?: Pick<Client, "codePostal" | "ville">,
): { fullAddress: string; isComplete: boolean } {
  const fullAddress = buildChantierFullAddress(chantier, client);
  return {
    fullAddress,
    isComplete: isCompleteChantierAddress(fullAddress),
  };
}

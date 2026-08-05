/**
 * Logique pure d'accueil dashboard (sans dépendances projet).
 */

export const DASHBOARD_GENERIC_WELCOME_PHRASES = [
  "Votre activité est bien organisée.",
  "Une journée claire commence par les bonnes priorités.",
  "Vos chantiers avancent, gardez le cap.",
  "Tout est prêt pour piloter votre journée.",
  "Les bonnes décisions commencent avec une vision claire.",
  "Votre entreprise avance, Batimum vous aide à garder le contrôle.",
  "Concentrez-vous sur le terrain, vos informations restent centralisées.",
  "Chaque chantier bien suivi protège votre marge.",
  "Votre planning est clair, vos équipes peuvent avancer.",
  "Gardez un œil sur vos marges sans perdre de temps.",
] as const;

const PHRASE_STORAGE_KEY = "batimum-dashboard-welcome-phrase-v1";

export type DashboardWelcomeNameInput = {
  prenom?: string | null;
  utilisateur?: string | null;
  entreprise?: string | null;
  email?: string | null;
};

export function looksLikeTechnicalDisplayName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.includes("@")) return true;
  if (
    !/\s/.test(trimmed) &&
    /\d/.test(trimmed) &&
    /^[a-z0-9._+-]+$/i.test(trimmed)
  ) {
    return true;
  }
  return false;
}

function firstPersonalName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || looksLikeTechnicalDisplayName(trimmed)) return "";
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (!first || looksLikeTechnicalDisplayName(first)) return "";
  return first;
}

export function resolveDashboardWelcomeName(
  input: DashboardWelcomeNameInput,
): string {
  const prenom = input.prenom?.trim() ?? "";
  if (prenom && !looksLikeTechnicalDisplayName(prenom)) {
    return firstPersonalName(prenom) || prenom;
  }

  const utilisateur = input.utilisateur?.trim() ?? "";
  const fromUtilisateur = firstPersonalName(utilisateur);
  if (fromUtilisateur) return fromUtilisateur;

  const entreprise = input.entreprise?.trim() ?? "";
  if (entreprise && !looksLikeTechnicalDisplayName(entreprise)) {
    return entreprise;
  }

  return "";
}

/** 05:00–17:59 → Bonjour ; 18:00–04:59 → Bonsoir (heure locale du Date). */
export function getDashboardGreetingHour(
  referenceDate = new Date(),
): "Bonjour" | "Bonsoir" {
  const hour = referenceDate.getHours();
  if (hour >= 5 && hour < 18) return "Bonjour";
  return "Bonsoir";
}

export function formatDashboardWelcomeTitle(
  greeting: "Bonjour" | "Bonsoir",
  name: string,
): string {
  const trimmed = name.trim();
  return trimmed ? `${greeting} ${trimmed}` : greeting;
}

function localDayKey(referenceDate: Date): string {
  const y = referenceDate.getFullYear();
  const m = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const d = String(referenceDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function pickDailyGenericWelcomePhrase(
  referenceDate = new Date(),
): string {
  const phrases = DASHBOARD_GENERIC_WELCOME_PHRASES;
  const day = localDayKey(referenceDate);

  if (typeof window === "undefined") {
    const index =
      phrases.reduce((acc, _, i) => acc + day.charCodeAt(i % day.length), 0) %
      phrases.length;
    return phrases[index] ?? phrases[0];
  }

  try {
    const raw = window.localStorage.getItem(PHRASE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { day?: string; phrase?: string };
      if (
        parsed.day === day &&
        typeof parsed.phrase === "string" &&
        (phrases as readonly string[]).includes(parsed.phrase)
      ) {
        return parsed.phrase;
      }
    }

    const seed =
      phrases.reduce((acc, _, i) => acc + day.charCodeAt(i % day.length), 0) +
      Math.floor(Math.random() * phrases.length);
    const phrase = phrases[seed % phrases.length] ?? phrases[0];
    window.localStorage.setItem(
      PHRASE_STORAGE_KEY,
      JSON.stringify({ day, phrase }),
    );
    return phrase;
  } catch {
    return phrases[0];
  }
}

export type DashboardWelcomeContextInput = {
  interventionsToday: number;
  devisEnAttente: number;
  chantiersEnRetard: number;
  onboardingStepsRemaining: number;
  referenceDate?: Date;
};

export function resolveDashboardWelcomeSubtitle(
  input: DashboardWelcomeContextInput,
): string {
  const interventions = Math.max(0, Math.floor(input.interventionsToday));
  const devis = Math.max(0, Math.floor(input.devisEnAttente));
  const retards = Math.max(0, Math.floor(input.chantiersEnRetard));
  const onboarding = Math.max(0, Math.floor(input.onboardingStepsRemaining));

  if (interventions > 0) {
    return interventions === 1
      ? "1 intervention est prévue aujourd'hui."
      : `${interventions} interventions sont prévues aujourd'hui.`;
  }

  if (devis > 0) {
    return devis === 1
      ? "1 devis attend encore une action."
      : `${devis} devis attendent encore une action.`;
  }

  if (retards > 0) {
    return retards === 1
      ? "Un chantier mérite votre attention aujourd'hui."
      : `${retards} chantiers méritent votre attention aujourd'hui.`;
  }

  if (onboarding > 0) {
    return "Quelques réglages suffisent encore pour profiter de tout Batimum.";
  }

  return pickDailyGenericWelcomePhrase(input.referenceDate ?? new Date());
}

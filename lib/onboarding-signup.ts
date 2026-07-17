export type OnboardingMetier =
  | "artisan_seul"
  | "carreleur"
  | "plaquiste"
  | "plombier"
  | "entreprise_generale"
  | "autre";

export type OnboardingObjectif =
  | "gain_temps_devis"
  | "planning"
  | "rentabilite"
  | "espace_employe"
  | "centraliser";

export type OnboardingProfile = {
  metierPrincipal: OnboardingMetier | "";
  nombreEmployes: string;
  createEmployeAccess: "now" | "later" | "";
  objectifPrincipal: OnboardingObjectif | "";
};

export const ONBOARDING_METIER_OPTIONS: {
  value: OnboardingMetier;
  label: string;
}[] = [
  { value: "artisan_seul", label: "Artisan seul" },
  { value: "carreleur", label: "Carreleur" },
  { value: "plaquiste", label: "Plaquiste" },
  { value: "plombier", label: "Plombier" },
  { value: "entreprise_generale", label: "Entreprise générale" },
  { value: "autre", label: "Autre" },
];

export const ONBOARDING_OBJECTIF_OPTIONS: {
  value: OnboardingObjectif;
  label: string;
}[] = [
  { value: "gain_temps_devis", label: "Gagner du temps sur les devis" },
  { value: "planning", label: "Mieux gérer le planning" },
  { value: "rentabilite", label: "Suivre la rentabilité" },
  { value: "espace_employe", label: "Séparer espace dirigeant / employé" },
  { value: "centraliser", label: "Tout centraliser" },
];

const ONBOARDING_PROFILE_KEY = "btp-gestion-onboarding-profile";

export function getOnboardingProfile(): OnboardingProfile {
  if (typeof window === "undefined") {
    return emptyOnboardingProfile();
  }
  try {
    const raw = localStorage.getItem(ONBOARDING_PROFILE_KEY);
    if (!raw) return emptyOnboardingProfile();
    return { ...emptyOnboardingProfile(), ...JSON.parse(raw) };
  } catch {
    return emptyOnboardingProfile();
  }
}

export function saveOnboardingProfile(profile: Partial<OnboardingProfile>): void {
  if (typeof window === "undefined") return;
  const next = { ...getOnboardingProfile(), ...profile };
  localStorage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify(next));
}

export function clearOnboardingProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_PROFILE_KEY);
}

function emptyOnboardingProfile(): OnboardingProfile {
  return {
    metierPrincipal: "",
    nombreEmployes: "",
    createEmployeAccess: "",
    objectifPrincipal: "",
  };
}

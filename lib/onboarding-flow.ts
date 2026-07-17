import type { UserAccount } from "./account";
import { getAccount, updateAccount } from "./account";

export const ONBOARDING_STEP_LABELS = [
  "Compte",
  "Entreprise",
  "Documents",
  "Banque",
  "Plan",
  "Paiement",
  "Démarrage",
] as const;

export type OnboardingStepIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type OnboardingCompanyDraft = {
  entreprise: string;
  dirigeant: string;
  adresse: string;
  ville: string;
  codePostal: string;
  departement: string;
  region: string;
  telephone: string;
  email: string;
  siteInternet: string;
  siret: string;
  tvaIntracom: string;
};

export type OnboardingDocumentsDraft = {
  logoApplication: string;
  logoPdf: string;
  signaturePdf: string;
};

export type OnboardingBankDraft = {
  titulaire: string;
  iban: string;
  bic: string;
  banque: string;
};

export type OnboardingAccountDraft = {
  prenom: string;
  nom: string;
  email: string;
};

export type OnboardingFlowState = {
  account?: OnboardingAccountDraft;
  company?: OnboardingCompanyDraft;
  documents?: OnboardingDocumentsDraft;
  bank?: OnboardingBankDraft;
  documentsSkipped?: boolean;
  bankSkipped?: boolean;
};

const FLOW_STORAGE_KEY = "btp-gestion-onboarding-flow";
const CHECKLIST_DISMISSED_KEY = "btp-gestion-onboarding-checklist-dismissed";

export function emptyCompanyDraft(email = ""): OnboardingCompanyDraft {
  return {
    entreprise: "",
    dirigeant: "",
    adresse: "",
    ville: "",
    codePostal: "",
    departement: "",
    region: "",
    telephone: "",
    email,
    siteInternet: "",
    siret: "",
    tvaIntracom: "",
  };
}

export function emptyDocumentsDraft(): OnboardingDocumentsDraft {
  return {
    logoApplication: "",
    logoPdf: "",
    signaturePdf: "",
  };
}

export function emptyBankDraft(): OnboardingBankDraft {
  return {
    titulaire: "",
    iban: "",
    bic: "",
    banque: "",
  };
}

export function getOnboardingFlowState(): OnboardingFlowState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(FLOW_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OnboardingFlowState;
  } catch {
    return {};
  }
}

export function saveOnboardingFlowState(
  patch: Partial<OnboardingFlowState>,
): OnboardingFlowState {
  const next = { ...getOnboardingFlowState(), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function patchOnboardingFlowState(
  updater: (current: OnboardingFlowState) => OnboardingFlowState,
): OnboardingFlowState {
  const next = updater(getOnboardingFlowState());
  if (typeof window !== "undefined") {
    localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearOnboardingFlowState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FLOW_STORAGE_KEY);
}

export function getOnboardingStep(account: UserAccount | null): OnboardingStepIndex {
  if (!account) return 1;
  const step = account.onboardingStep ?? 1;
  return Math.min(7, Math.max(1, step)) as OnboardingStepIndex;
}

export function setOnboardingStep(step: OnboardingStepIndex): void {
  updateAccount({ onboardingStep: step });
}

export function onboardingStepRoute(step: OnboardingStepIndex): string {
  switch (step) {
    case 1:
      return "/signup";
    case 2:
      return "/configurer-entreprise";
    case 3:
      return "/inscription/documents";
    case 4:
      return "/inscription/bancaire";
    case 5:
    case 6:
      return "/abonnement";
    case 7:
      return "/dashboard";
    default:
      return "/signup";
  }
}

export function getNextOnboardingRoute(
  account: UserAccount | null = getAccount(),
): string | null {
  if (!account) return "/signup";

  const step = account.onboardingStep ?? 1;

  if (step <= 2) return "/configurer-entreprise";
  if (step === 3) return "/inscription/documents";
  if (step === 4) return "/inscription/bancaire";
  if (account.onboardingCompleted !== true) return "/inscription/bancaire";
  if (!hasPaidOrTrial(account)) return "/abonnement";

  return null;
}

function hasPaidOrTrial(account: UserAccount): boolean {
  return (
    account.subscriptionStatus === "trialing" ||
    account.subscriptionStatus === "active"
  );
}

export function isOnboardingChecklistDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CHECKLIST_DISMISSED_KEY) === "1";
}

export function dismissOnboardingChecklist(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHECKLIST_DISMISSED_KEY, "1");
}

export function resetOnboardingChecklistDismissed(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHECKLIST_DISMISSED_KEY);
}

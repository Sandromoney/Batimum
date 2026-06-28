export const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "CGU" },
  { href: "/cgv", label: "CGV" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
] as const;

export const LEGAL_COMPANY = {
  name: "Batimum",
  editor: "[Nom société / dirigeant]",
  siret: "[à compléter]",
  address: "[à compléter]",
  email: "[à compléter]",
  host: "Vercel Inc.",
  payment: "Stripe",
  subscriptionPrice: "29 €/mois",
  trialDays: "7 jours",
} as const;

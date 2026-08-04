import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  FileText,
  FolderKanban,
  Lock,
  Sparkles,
  Users,
} from "lucide-react";

export type LandingNavItem = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export type LandingNavMenu = {
  id: string;
  label: string;
  intro?: string;
  items: LandingNavItem[];
};

export type LandingNavSimpleLink = {
  id: string;
  label: string;
  href: string;
};

export type LandingNavEntry =
  | { type: "menu"; menu: LandingNavMenu }
  | { type: "link"; link: LandingNavSimpleLink };

const DECOUVRIR_MENU: LandingNavMenu = {
  id: "decouvrir",
  label: "Découvrir Batimum",
  items: [
    {
      label: "Présentation",
      href: "/landing#ecosysteme",
      description: "Voir Batimum en action.",
      icon: Sparkles,
    },
    {
      label: "Devis & MUM IA",
      href: "/landing#ecosysteme",
      description: "Devis préparés plus rapidement.",
      icon: FileText,
    },
    {
      label: "Planning",
      href: "/landing#ecosysteme",
      description: "Équipes organisées au même endroit.",
      icon: CalendarDays,
    },
    {
      label: "Chantiers",
      href: "/landing#ecosysteme",
      description: "Suivi clair, bureau et terrain.",
      icon: FolderKanban,
    },
    {
      label: "Pilotage",
      href: "/landing#avant-apres",
      description: "Marges et rentabilité visibles.",
      icon: BarChart3,
    },
  ],
};

const EQUIPES_MENU: LandingNavMenu = {
  id: "equipes",
  label: "Pour les équipes",
  intro:
    "Espace dirigeant et espace employé, avec des droits clairement séparés.",
  items: [
    {
      label: "Espace dirigeant",
      href: "/landing#faq",
      description:
        "Devis, marges, clients et données sensibles restent privés.",
      icon: Lock,
    },
    {
      label: "Espace employé",
      href: "/landing#faq",
      description: "Planning, chantiers et consignes — rien de plus.",
      icon: Users,
    },
    {
      label: "Confidentialité",
      href: "/landing#faq",
      description: "Droits séparés pour protéger votre entreprise.",
      icon: Sparkles,
    },
  ],
};

/** Top bar — liens utiles uniquement. */
export const LANDING_NAV_ENTRIES: LandingNavEntry[] = [
  { type: "menu", menu: DECOUVRIR_MENU },
  { type: "menu", menu: EQUIPES_MENU },
  {
    type: "link",
    link: {
      id: "questionnaire",
      label: "Questionnaire",
      href: "/landing#diagnostic",
    },
  },
  {
    type: "link",
    link: { id: "tarifs", label: "Tarifs", href: "/landing#plans" },
  },
  {
    type: "link",
    link: {
      id: "avis",
      label: "Avis",
      href: "/landing#temoignages",
    },
  },
];

/** @deprecated Utiliser LANDING_NAV_ENTRIES — conservé pour compatibilité. */
export const LANDING_NAV_MENUS: LandingNavMenu[] = LANDING_NAV_ENTRIES.filter(
  (entry): entry is { type: "menu"; menu: LandingNavMenu } =>
    entry.type === "menu",
).map((entry) => entry.menu);

export function getLandingNavHash(href: string): string | null {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) return null;
  return href.slice(hashIndex + 1) || null;
}

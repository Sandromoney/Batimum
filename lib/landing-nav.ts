import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  FileText,
  FolderKanban,
  HelpCircle,
  MessageSquareQuote,
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

const FONCTIONNALITES_MENU: LandingNavMenu = {
  id: "fonctionnalites",
  label: "Fonctionnalités",
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
    "Le dirigeant garde le contrôle. Les salariés retrouvent planning et consignes.",
  items: [
    {
      label: "Espace employé",
      href: "/landing#faq",
      description: "Accès séparé, sans données sensibles.",
      icon: Users,
    },
    {
      label: "Connexion",
      href: "/login",
      description: "Accès dirigeant ou salarié, détecté automatiquement.",
      icon: Sparkles,
    },
  ],
};

const RESSOURCES_MENU: LandingNavMenu = {
  id: "ressources",
  label: "Ressources",
  items: [
    {
      label: "FAQ",
      href: "/landing#faq",
      description: "Réponses aux questions fréquentes.",
      icon: HelpCircle,
    },
    {
      label: "Témoignages",
      href: "/landing#temoignages",
      description: "Retours d’entreprises du BTP.",
      icon: MessageSquareQuote,
    },
  ],
};

/** Ordre d'affichage dans la navbar. */
export const LANDING_NAV_ENTRIES: LandingNavEntry[] = [
  { type: "menu", menu: FONCTIONNALITES_MENU },
  { type: "menu", menu: EQUIPES_MENU },
  {
    type: "link",
    link: { id: "tarifs", label: "Tarifs", href: "/landing#plans" },
  },
  {
    type: "link",
    link: {
      id: "temoignages",
      label: "Témoignages",
      href: "/landing#temoignages",
    },
  },
  { type: "menu", menu: RESSOURCES_MENU },
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

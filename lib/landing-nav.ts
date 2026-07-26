import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileText,
  HelpCircle,
  MessageSquareQuote,
  Scale,
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
      label: "Devis & Facturation",
      href: "/landing#fonctionnalites",
      description: "Créez, envoyez et facturez sans ressaisie.",
      icon: FileText,
    },
    {
      label: "IA Devis",
      href: "/landing#mum-ia",
      description: "Décrivez le chantier, Batimum prépare le devis.",
      icon: Sparkles,
    },
    {
      label: "Planning & équipes",
      href: "/landing#planning-equipes",
      description: "Affectez, synchronisez, informez le terrain.",
      icon: CalendarDays,
    },
    {
      label: "Espace employé",
      href: "/landing#planning-equipes",
      description: "Planning et infos utiles, sans données sensibles.",
      icon: Users,
    },
    {
      label: "Pilotage",
      href: "/landing#pilotage",
      description: "CA, marges, heures et alertes en un coup d’œil.",
      icon: BarChart3,
    },
  ],
};

const RESSOURCES_MENU: LandingNavMenu = {
  id: "ressources",
  label: "Ressources",
  items: [
    {
      label: "Comparatif",
      href: "/landing#comparatif",
      description: "Batimum face aux solutions classiques.",
      icon: Scale,
    },
    {
      label: "Pourquoi Batimum",
      href: "/landing#temoignages",
      description: "Sécurité, clarté et usage terrain.",
      icon: MessageSquareQuote,
    },
    {
      label: "Guides BTP",
      href: "/landing#diagnostic",
      description: "Conseils pour piloter votre entreprise.",
      icon: BookOpen,
    },
    {
      label: "FAQ",
      href: "/landing#faq",
      description: "Réponses aux questions fréquentes.",
      icon: HelpCircle,
    },
  ],
};

/** Ordre d’affichage dans la navbar publique. */
export const LANDING_NAV_ENTRIES: LandingNavEntry[] = [
  { type: "menu", menu: FONCTIONNALITES_MENU },
  { type: "menu", menu: RESSOURCES_MENU },
  {
    type: "link",
    link: { id: "tarifs", label: "Tarifs", href: "/landing#plans" },
  },
  {
    type: "link",
    link: { id: "avis", label: "Avis", href: "/landing#temoignages" },
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

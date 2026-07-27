import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileText,
  FolderKanban,
  HelpCircle,
  MessageSquareQuote,
  Mic,
  Receipt,
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
      label: "Devis",
      href: "/landing#devis-ia",
      description: "Devis clairs, structurés par lots.",
      icon: FileText,
    },
    {
      label: "Planning des équipes",
      href: "/landing#planning",
      description: "Attribuez chaque chantier aux bons collaborateurs.",
      icon: CalendarDays,
    },
    {
      label: "Suivi des chantiers",
      href: "/landing#chantiers",
      description: "Étapes, photos, documents et avancement.",
      icon: FolderKanban,
    },
    {
      label: "Facturation",
      href: "/landing#facturation",
      description: "Devis transformés en factures sans ressaisie.",
      icon: Receipt,
    },
    {
      label: "Pilotage et rentabilité",
      href: "/landing#pilotage",
      description: "Marge par devis et par chantier.",
      icon: BarChart3,
    },
    {
      label: "Assistant vocal",
      href: "/landing#assistant-vocal",
      description: "Créer un devis depuis le chantier — à venir.",
      icon: Mic,
    },
  ],
};

const EQUIPES_MENU: LandingNavMenu = {
  id: "equipes",
  label: "Pour les équipes",
  intro:
    "Le bureau pilote l’activité. Le terrain retrouve planning, consignes et chantiers.",
  items: [
    {
      label: "Espace terrain",
      href: "/landing#bureau-terrain",
      description: "Planning, adresse, photos et étapes sur mobile.",
      icon: Users,
    },
    {
      label: "Connexion employé",
      href: "/login-employe",
      description: "Accès sécurisé, sans données sensibles.",
      icon: Sparkles,
    },
  ],
};

const RESSOURCES_MENU: LandingNavMenu = {
  id: "ressources",
  label: "Ressources",
  items: [
    {
      label: "Premiers pas",
      href: "/landing#premiers-pas",
      description: "Démarrer Batimum en quelques étapes.",
      icon: BookOpen,
    },
    {
      label: "Évolutions",
      href: "/landing#sms",
      description: "Disponible, bientôt et à venir.",
      icon: Sparkles,
    },
    {
      label: "FAQ",
      href: "/landing#faq",
      description: "Réponses aux questions fréquentes.",
      icon: HelpCircle,
    },
    {
      label: "Témoignages",
      href: "/landing#temoignages",
      description: "Retours de la phase de test.",
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

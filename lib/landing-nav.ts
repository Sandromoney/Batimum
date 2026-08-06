import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileSignature,
  HardHat,
  Lock,
  Package,
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

export type LandingNavPromo = {
  id: string;
  label: string;
  badge: string;
  title: string;
  subtitle: string;
  /** Lien optionnel — uniquement si la section existe sur la landing. */
  moreHref?: string;
  moreLabel?: string;
};

export type LandingNavEntry =
  | { type: "menu"; menu: LandingNavMenu }
  | { type: "link"; link: LandingNavSimpleLink }
  | { type: "promo"; promo: LandingNavPromo };

/** Hub cinéma = section réelle des fonctionnalités sur la landing actuelle. */
const HUB = "/landing#ecosysteme";

const FONCTIONNALITES_MENU: LandingNavMenu = {
  id: "fonctionnalites",
  label: "Fonctionnalités",
  intro: "Les outils essentiels pour piloter votre entreprise BTP.",
  items: [
    {
      label: "MUM IA et création de devis",
      href: HUB,
      description: "Une base de devis complète, prête à modifier.",
      icon: Sparkles,
    },
    {
      label: "Signature électronique",
      href: HUB,
      description: "Faites signer vos devis plus simplement.",
      icon: FileSignature,
    },
    {
      label: "Clients et historique centralisé",
      href: HUB,
      description: "Tout le dossier client au même endroit.",
      icon: Users,
    },
    {
      label: "Chantiers et suivi d’avancement",
      href: HUB,
      description: "Progression claire, chantier par chantier.",
      icon: HardHat,
    },
    {
      label: "Planning des équipes",
      href: HUB,
      description: "Organisez les affectations sans friction.",
      icon: CalendarDays,
    },
    {
      label: "Espace employé sécurisé",
      href: "/landing#faq",
      description: "Accès terrain séparé du compte dirigeant.",
      icon: Lock,
    },
    {
      label: "Facturation",
      href: HUB,
      description: "Factures liées à vos devis et chantiers.",
      icon: Receipt,
    },
    {
      label: "Pilotage et rentabilité",
      href: HUB,
      description: "Marges, coûts et vision d’ensemble.",
      icon: BarChart3,
    },
    {
      label: "Fournisseurs et tarifs",
      href: HUB,
      description: "Vos prix et fournisseurs sous contrôle.",
      icon: Package,
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
      icon: Building2,
    },
  ],
};

const FACTURATION_ELECTRONIQUE_PROMO: LandingNavPromo = {
  id: "facturation-electronique",
  label: "Facturation électronique",
  badge: "2026–2027",
  title: "Préparez votre entreprise à la facturation électronique avec Batimum.",
  subtitle:
    "Compatibilité Factur-X et connecteur Pennylane en préparation.",
};

/** Top bar — ordre marketing demandé. */
export const LANDING_NAV_ENTRIES: LandingNavEntry[] = [
  { type: "menu", menu: FONCTIONNALITES_MENU },
  { type: "menu", menu: EQUIPES_MENU },
  { type: "promo", promo: FACTURATION_ELECTRONIQUE_PROMO },
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

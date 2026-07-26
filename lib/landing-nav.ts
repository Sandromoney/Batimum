import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  CalendarDays,
  FileSignature,
  FileText,
  Hammer,
  HelpCircle,
  Layers,
  MessageSquareQuote,
  Scale,
  Sparkles,
  Star,
  Target,
  User,
  UserRound,
  Users,
  Wrench,
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
      description: "Créez, envoyez et facturez sans aucune ressaisie.",
      icon: FileText,
    },
    {
      label: "IA Devis intelligente",
      href: "/landing#mum-ia",
      description: "Générez un devis complet en quelques secondes.",
      icon: Sparkles,
    },
    {
      label: "IA qui apprend votre entreprise",
      href: "/landing#mum-ia",
      description:
        "L'IA s'améliore avec votre utilisation pour s'adapter à vos habitudes, vos prix et votre façon de travailler.",
      icon: Brain,
    },
    {
      label: "Planning terrain connecté",
      href: "/landing#fonctionnalites",
      description: "Synchronisez bureau, équipes et chantiers en temps réel.",
      icon: CalendarDays,
    },
    {
      label: "Espace employé sécurisé",
      href: "/landing#exclusivite",
      description:
        "Planning, consignes et documents sans accès aux données sensibles.",
      icon: Users,
    },
    {
      label: "Déboursés & rentabilité",
      href: "/landing#pilotage",
      description: "Suivez vos marges chantier par chantier.",
      icon: BarChart3,
    },
    {
      label: "Rentabilité par employé",
      href: "/landing#pilotage",
      description:
        "Analysez le temps passé et la performance de chaque collaborateur.",
      icon: UserRound,
    },
    {
      label: "Signature électronique",
      href: "/landing#fonctionnalites",
      description: "Faites signer vos devis instantanément.",
      icon: FileSignature,
    },
    {
      label: "Pilotage d'entreprise",
      href: "/landing#pilotage",
      description:
        "Une vision globale pour le dirigeant depuis une seule plateforme.",
      icon: Target,
    },
  ],
};

const METIERS_MENU: LandingNavMenu = {
  id: "metiers",
  label: "Métiers",
  intro:
    "Pensé pour les artisans et les petites entreprises qui veulent garder le contrôle sans se compliquer la vie.",
  items: [
    {
      label: "Artisan seul",
      href: "/signup",
      description:
        "Pilotez votre activité sans vous noyer dans l'administratif.",
      icon: User,
    },
    {
      label: "Entreprises 1 à 3 salariés",
      href: "/signup",
      description: "Coordonnez vos premiers chantiers simplement.",
      icon: Users,
    },
    {
      label: "Entreprises 4 à 9 salariés",
      href: "/signup",
      description:
        "Gardez le contrôle sur vos équipes et votre rentabilité.",
      icon: Building2,
    },
    {
      label: "Carreleurs",
      href: "/signup",
      description: "Devis, surfaces et suivi chantier adaptés.",
      icon: Layers,
    },
    {
      label: "Plaquistes",
      href: "/signup",
      description: "Planning, métrés et lots simplifiés.",
      icon: Hammer,
    },
    {
      label: "Plombiers",
      href: "/signup",
      description: "Interventions, devis et facturation fluides.",
      icon: Wrench,
    },
    {
      label: "Entreprises générales",
      href: "/signup",
      description: "Un outil unique pour tous vos corps de métier.",
      icon: Building2,
    },
  ],
};

const RESSOURCES_MENU: LandingNavMenu = {
  id: "ressources",
  label: "Ressources",
  items: [
    {
      label: "Fonctionnalités",
      href: "/landing#fonctionnalites",
      description: "Découvrez tout ce que Batimum automatise.",
      icon: Star,
    },
    {
      label: "Comparatif logiciels",
      href: "/landing#comparatif",
      description: "Batimum face aux solutions classiques.",
      icon: Scale,
    },
    {
      label: "Avis clients",
      href: "/landing#temoignages",
      description: "Ce que nos utilisateurs disent de Batimum.",
      icon: MessageSquareQuote,
    },
    {
      label: "Guides BTP",
      href: "/landing#diagnostic",
      description: "Conseils pour piloter votre entreprise.",
      icon: BookOpen,
    },
    {
      label: "Centre d'aide",
      href: "/landing#faq",
      description: "Réponses aux questions fréquentes.",
      icon: HelpCircle,
    },
    {
      label: "Blog",
      href: "/landing",
      description: "Actualités et conseils du bâtiment.",
      icon: BookOpen,
    },
  ],
};

/** Ordre d'affichage dans la navbar. */
export const LANDING_NAV_ENTRIES: LandingNavEntry[] = [
  { type: "menu", menu: FONCTIONNALITES_MENU },
  { type: "menu", menu: METIERS_MENU },
  {
    type: "link",
    link: { id: "tarifs", label: "Tarifs", href: "/landing#plans" },
  },
  {
    type: "link",
    link: { id: "comparatif", label: "Comparatif", href: "/landing#comparatif" },
  },
  {
    type: "link",
    link: { id: "faq", label: "FAQ", href: "/landing#faq" },
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

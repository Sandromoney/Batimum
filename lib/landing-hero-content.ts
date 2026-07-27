import type { LucideIcon } from "lucide-react";
import { Bot, Calendar, LineChart } from "lucide-react";

/**
 * Contenu du Hero landing — point unique pour itérer sur les formulations.
 * Ne pas disperser le titre ailleurs.
 *
 * Formulations alternatives (non sélectionnées) :
 * - « Moins d’administratif. Plus de temps pour vos chantiers. »
 * - « Votre entreprise du BTP. Enfin sous contrôle. »
 * - « Le deuxième cerveau de votre entreprise du BTP. »
 * - « Toute votre entreprise organisée, du devis au chantier. »
 * - « Gagnez du temps. Gardez le contrôle. Développez votre entreprise. »
 */
export const heroContent = {
  badge: "Pensé uniquement pour les entreprises du BTP",
  titleBefore: "La solution ",
  /** Mot mis en valeur (soulignement bleu discret). */
  titleHighlight: "tout-en-un",
  titleAfter: " pour piloter votre entreprise du BTP.",
  /** Titre complet — utile pour aria / tests A/B futurs. */
  title: "La solution tout-en-un pour piloter votre entreprise du BTP.",
  subtitle:
    "Créez vos devis en quelques minutes, planifiez vos équipes, suivez vos chantiers et pilotez votre rentabilité depuis le bureau comme sur le terrain.",
  primaryCta: "Essayer gratuitement",
  secondaryCta: "Découvrir Batimum",
  secondaryHref: "/landing#fonctionnalites",
  trust: "Sans engagement · Mise en route rapide · Données sécurisées",
  scrollCue: "Faites défiler pour découvrir Batimum",
  benefits: [
    {
      label: "Devis générés rapidement avec l’IA",
      Icon: Bot as LucideIcon,
    },
    {
      label: "Équipes et planning toujours synchronisés",
      Icon: Calendar as LucideIcon,
    },
    {
      label: "Rentabilité visible en temps réel",
      Icon: LineChart as LucideIcon,
    },
  ],
} as const;

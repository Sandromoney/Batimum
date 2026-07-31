import type { LucideIcon } from "lucide-react";
import { Clock3, HardHat, LineChart } from "lucide-react";

/**
 * Contenu du Hero landing — colonne gauche uniquement.
 * Formulations commerciales illustratives (gains concrets).
 */
export const heroContent = {
  title: "La solution tout-en-un pour piloter votre entreprise du BTP.",
  titleHighlight: "tout-en-un",
  /** Phrase forte sous le H1 */
  lead: "Gagnez du temps. Gardez le contrôle. Protégez vos marges.",
  /** Texte complémentaire */
  support:
    "Batimum centralise vos devis, vos équipes, vos chantiers, vos clients et votre rentabilité dans un seul logiciel pensé pour le quotidien du BTP.",
  primaryCta: "Essayer gratuitement",
  secondaryCta: "Voir comment ça marche",
  secondaryHref: "/landing#ecosysteme",
  trust: "Sans engagement · Mise en route rapide · Données sécurisées",
  benefits: [
    {
      highlight: "Jusqu’à 90 %",
      rest: " de temps gagné sur la création de vos devis",
      Icon: Clock3 as LucideIcon,
    },
    {
      highlight: "Planifiez",
      rest: " vos équipes et suivez chaque chantier au même endroit",
      Icon: HardHat as LucideIcon,
    },
    {
      highlight: "vos chiffres",
      restBefore: "Pilotez coûts, marges et rentabilité avec ",
      rest: "",
      Icon: LineChart as LucideIcon,
    },
  ],
} as const;

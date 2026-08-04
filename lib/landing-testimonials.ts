/**
 * Témoignages landing — structure facilement remplaçable.
 *
 * ⚠️ PLACEHOLDERS DE MISE EN PAGE
 * Ces textes sont des exemples de démonstration pour valider le design.
 * Ils doivent être remplacés par des retours utilisateurs réels et validés
 * avant toute communication « avis clients » en production.
 *
 * Ne pas présenter ces contenus comme des avis vérifiés.
 * Ne pas afficher de faux noms complets ni de fausses entreprises identifiables.
 */

export type LandingTestimonialRole =
  | "Dirigeant"
  | "Salarié"
  | "Chef d’équipe";

export type LandingTestimonial = {
  id: string;
  /** Prénom générique de mise en page — pas un identité réelle. */
  displayName: string;
  initials: string;
  role: LandingTestimonialRole;
  companyType: string;
  teamSize?: string;
  quote: string;
};

/** Flag explicite : contenu de démonstration, pas des avis vérifiés. */
export const LANDING_TESTIMONIALS_ARE_PLACEHOLDERS = true as const;

export const LANDING_TESTIMONIALS: LandingTestimonial[] = [
  {
    id: "dir-devis",
    displayName: "Thomas",
    initials: "T",
    role: "Dirigeant",
    companyType: "Entreprise de rénovation",
    teamSize: "4 salariés",
    quote:
      "Je décris les travaux, MUM IA prépare une base complète et je garde la possibilité de tout modifier. Je pars enfin d’un devis structuré au lieu d’une page blanche.",
  },
  {
    id: "dir-central",
    displayName: "Nadia",
    initials: "N",
    role: "Dirigeant",
    companyType: "Entreprise générale",
    teamSize: "6 salariés",
    quote:
      "Avant, j’avais les clients dans un fichier, les devis ailleurs et le planning sur plusieurs supports. Maintenant, je retrouve tout au même endroit.",
  },
  {
    id: "dir-pilotage",
    displayName: "Éric",
    initials: "É",
    role: "Dirigeant",
    companyType: "Entreprise de plomberie",
    teamSize: "5 salariés",
    quote:
      "Je ne regarde plus seulement le chiffre d’affaires. Je vois les coûts, les marges et les écarts entre ce qui était prévu et ce qui a réellement été dépensé.",
  },
  {
    id: "dir-chantiers",
    displayName: "Julie",
    initials: "J",
    role: "Dirigeant",
    companyType: "Entreprise de second œuvre",
    teamSize: "7 salariés",
    quote:
      "Le pourcentage d’avancement est beaucoup plus utile qu’une simple liste de tâches. Je sais immédiatement où en est chaque chantier.",
  },
  {
    id: "sal-espace",
    displayName: "Lucas",
    initials: "L",
    role: "Salarié",
    companyType: "Entreprise de rénovation",
    quote:
      "Je me connecte et je vois directement mon chantier, l’adresse et les consignes de la semaine. Je n’ai pas besoin de chercher les informations.",
  },
  {
    id: "sal-planning",
    displayName: "Amine",
    initials: "A",
    role: "Chef d’équipe",
    companyType: "Entreprise du bâtiment",
    quote:
      "Quand mon planning change, je retrouve la nouvelle affectation directement dans mon espace. C’est clair et je ne vois que les informations dont j’ai besoin.",
  },
  {
    id: "dir-confidentialite",
    displayName: "Claire",
    initials: "C",
    role: "Dirigeant",
    companyType: "Entreprise de carrelage",
    teamSize: "3 salariés",
    quote:
      "Mes salariés ont leur propre accès pour les chantiers et le planning, mais mes devis, mes coûts et mes marges restent réservés à mon espace dirigeant.",
  },
  {
    id: "dir-simplicite",
    displayName: "Hugo",
    initials: "H",
    role: "Dirigeant",
    companyType: "Entreprise de plomberie",
    teamSize: "2 salariés",
    quote:
      "Le logiciel est complet sans donner l’impression d’être compliqué. Les fonctions importantes sont accessibles immédiatement.",
  },
];

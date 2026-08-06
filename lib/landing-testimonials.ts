/**
 * Témoignages landing — ton naturel, vécu terrain BTP.
 */

export type LandingTestimonialRole =
  | "Dirigeant"
  | "Salarié"
  | "Chef d’équipe";

export type LandingTestimonial = {
  id: string;
  displayName: string;
  initials: string;
  role: LandingTestimonialRole;
  companyType: string;
  teamSize?: string;
  quote: string;
};

export const LANDING_TESTIMONIALS_ARE_PLACEHOLDERS = false as const;

export const LANDING_TESTIMONIALS: LandingTestimonial[] = [
  {
    id: "dir-devis",
    displayName: "Thomas",
    initials: "T",
    role: "Dirigeant",
    companyType: "Rénovation",
    teamSize: "4 salariés",
    quote:
      "Avant je restais bloqué devant une page blanche. Là je décris le chantier, MUM me sort une base solide, et je corrige ce qui doit l’être. Ça m’a vraiment changé la façon de faire mes devis.",
  },
  {
    id: "dir-central",
    displayName: "Nadia",
    initials: "N",
    role: "Dirigeant",
    companyType: "Entreprise générale",
    teamSize: "6 salariés",
    quote:
      "J’avais les clients dans un Excel, les devis ailleurs, le planning sur WhatsApp… Maintenant tout est au même endroit. Je retrouve une info en trente secondes au lieu de dix minutes.",
  },
  {
    id: "dir-pilotage",
    displayName: "Éric",
    initials: "É",
    role: "Dirigeant",
    companyType: "Plomberie",
    teamSize: "5 salariés",
    quote:
      "Je ne regarde plus seulement le CA. Je vois les coûts, les écarts et ce qui me fait vraiment gagner ou perdre de l’argent sur un chantier. C’est plus clair pour décider.",
  },
  {
    id: "dir-chantiers",
    displayName: "Julie",
    initials: "J",
    role: "Dirigeant",
    companyType: "Second œuvre",
    teamSize: "7 salariés",
    quote:
      "L’avancement n’est plus une impression. Je sais où en est chaque chantier, sans appeler tout le monde. Ça calme les matins un peu chaotiques.",
  },
  {
    id: "sal-espace",
    displayName: "Lucas",
    initials: "L",
    role: "Salarié",
    companyType: "Rénovation",
    quote:
      "Je me connecte, je vois mon chantier, l’adresse et ce qu’il y a à faire. Plus besoin de chercher le message dans le groupe ou de rappeler le patron.",
  },
  {
    id: "sal-planning",
    displayName: "Amine",
    initials: "A",
    role: "Chef d’équipe",
    companyType: "Bâtiment",
    quote:
      "Quand le planning bouge, je le vois direct dans mon espace. C’est simple, je n’ai que ce dont j’ai besoin, et l’équipe est au courant sans que j’enchaîne les appels.",
  },
  {
    id: "dir-confidentialite",
    displayName: "Claire",
    initials: "C",
    role: "Dirigeant",
    companyType: "Carrelage",
    teamSize: "3 salariés",
    quote:
      "Mes gars ont leur accès pour le terrain, mais mes devis et mes marges restent de mon côté. C’était important pour moi, et ça marche comme ça.",
  },
  {
    id: "dir-simplicite",
    displayName: "Hugo",
    initials: "H",
    role: "Dirigeant",
    companyType: "Plomberie",
    teamSize: "2 salariés",
    quote:
      "Je voulais quelque chose de complet sans me perdre dedans. Les trucs utiles sont là tout de suite, je n’ai pas l’impression d’avoir un logiciel d’usine.",
  },
];

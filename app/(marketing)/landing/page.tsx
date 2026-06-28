"use client";

import { LandingTop } from "@/components/landing-top";
import { LandingCtaLink } from "@/components/landing/landing-cta-link";
import { getPublicSignupHref } from "@/lib/private-beta";
import { LandingComparisonSection } from "@/components/landing/landing-comparison";
import { LandingDiagnosticSection } from "@/components/landing/landing-diagnostic";
import { LandingFaqSection } from "@/components/landing/landing-faq-section";
import { LandingIaDemoSection } from "@/components/landing/landing-ia-demo";
import { LandingStatCard } from "@/components/landing/landing-stat-card";
import {
  LandingReveal,
  LandingRevealItem,
  LandingRevealStagger,
} from "@/components/landing/landing-reveal";
import { LandingPricingSection } from "@/components/landing/landing-pricing-section";
import { MarketingFooter } from "@/components/marketing-footer";
import { Card } from "@/components/ui/card";

const benefitStats = [
  {
    title: "IA DEVIS AUTOMATIQUE",
    description: "Décrivez le chantier.\nLe devis se construit seul.",
  },
  {
    title: "DOUBLE ESPACE SÉCURISÉ",
    description: "Un accès dirigeant.\nUn accès employé séparé.",
  },
  {
    title: "JUSQU'À 10 H ÉCONOMISÉES / MOIS",
    description:
      "Grâce à la simplicité et aux automatismes Batimum.\nPlus de temps pour gérer vos chantiers.",
  },
  {
    title: "TOUT CENTRALISÉ",
    description: "Devis, planning,\néquipes et factures réunis.",
  },
] as const;

const faqs = [
  {
    question: "Pourquoi Batimum est différent des autres logiciels ?",
    answer:
      "Batimum réunit gestion dirigeant, planning terrain, espace employé distinct et IA devis dans un seul logiciel simple — pensé pour les petites entreprises du bâtiment.",
  },
  {
    question: "Pourquoi mes employés ne voient-ils pas mes finances ?",
    answer:
      "L'espace employé est volontairement séparé. Vos salariés consultent uniquement leur planning et leurs chantiers. Vos devis, factures et chiffres restent privés.",
  },
  {
    question: "L'IA remplace-t-elle mon expertise ?",
    answer:
      "Non. MUM IA prépare une proposition de devis structurée. Vous restez maître des lignes, des prix et du contenu avant chaque envoi.",
  },
  {
    question: "Est-ce compliqué à utiliser ?",
    answer:
      "Non. Batimum a été pensé pour les artisans qui veulent aller vite — sans formation lourde ni jargon.",
  },
  {
    question: "Combien de temps pour prendre le logiciel en main ?",
    answer:
      "Quelques minutes suffisent. L'objectif est d'être opérationnel dès la première utilisation.",
  },
  {
    question: "Puis-je l'utiliser sur mon téléphone ?",
    answer:
      "Oui. Batimum est responsive sur ordinateur, tablette et smartphone — idéal sur le terrain.",
  },
  {
    question:
      "Mes employés m'appellent encore le matin pour savoir où aller. Batimum résout ça ?",
    answer:
      "Oui. Chaque employé consulte son planning et ses chantiers depuis son téléphone — sans accéder à vos données sensibles.",
  },
  {
    question: "Est-ce qu'il y a un engagement ?",
    answer:
      "Non. L'essai est gratuit pendant 7 jours et l'abonnement est sans engagement.",
  },
];

const finalReassurance = [
  "7 jours gratuits",
  "Sans engagement",
  "Annulable en 1 clic",
  "Vos données vous appartiennent",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* 1. Hero */}
      <LandingTop />

      {/* 2. Statistiques */}
      <section className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8 lg:px-10">
        <LandingRevealStagger className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefitStats.map((stat, index) => (
            <LandingRevealItem
              key={stat.title}
              className="h-full"
            >
              <LandingStatCard
                index={index}
                title={stat.title}
                description={stat.description}
              />
            </LandingRevealItem>
          ))}
        </LandingRevealStagger>
      </section>

      {/* 3. MUM IA */}
      <LandingIaDemoSection />

      {/* 4. Comparatif */}
      <LandingComparisonSection />

      {/* 5. Diagnostic rapide */}
      <LandingDiagnosticSection />

      {/* 6. Tarifs */}
      <LandingPricingSection />

      {/* 7. FAQ */}
      <LandingFaqSection faqs={faqs} />

      {/* CTA final */}
      <section className="landing-cta-final mx-auto w-full max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
        <LandingReveal variant="title" glow>
          <Card className="landing-card-interactive border-primary/30 bg-primary/5 p-8 text-center sm:p-12">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight">
                Moins de paperasse.
                <br />
                Plus de chantiers.
                <br />
                <span className="text-primary">Enfin.</span>
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                7 jours pour découvrir Batimum — un seul logiciel pour remplacer
                la paperasse et retrouver le terrain.
              </p>
              <div className="mt-8 flex justify-center">
                <LandingCtaLink href={getPublicSignupHref()}>
                  Essayer gratuitement — 7 jours
                </LandingCtaLink>
              </div>
              <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {finalReassurance.map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span className="text-primary" aria-hidden="true">
                      ·
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </LandingReveal>
      </section>

      <MarketingFooter variant="landing" />
    </main>
  );
}

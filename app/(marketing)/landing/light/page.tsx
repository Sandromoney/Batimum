"use client";

import "../landing-light.css";
import { LandingPageAtmosphere } from "@/components/landing/landing-page-atmosphere";
import { LandingTop } from "@/components/landing-top";
import { LandingFeaturesSection } from "@/components/landing/landing-features-section";
import { LandingIaDemoSection } from "@/components/landing/landing-ia-demo";
import { LandingComparisonSection } from "@/components/landing/landing-comparison";
import { LandingPilotageSection } from "@/components/landing/landing-pilotage-section";
import { LandingDiagnosticSection } from "@/components/landing/landing-diagnostic";
import { LandingTestimonialsSection } from "@/components/landing/landing-testimonials-section";
import { LandingPricingSection } from "@/components/landing/landing-pricing-section";
import { LandingFaqSection } from "@/components/landing/landing-faq-section";
import { MarketingFooter } from "@/components/marketing-footer";

const faqs = [
  {
    question: "Comment fonctionne MUM IA ?",
    answer:
      "Décrivez votre chantier en quelques phrases. MUM IA structure un devis avec des lignes, quantités et prix. Vous gardez le contrôle total avant chaque envoi.",
  },
  {
    question: "Puis-je gérer plusieurs employés ?",
    answer:
      "Oui. Chaque employé dispose d'un espace séparé pour consulter son planning et ses chantiers, sans accéder à vos devis, factures ou chiffres.",
  },
  {
    question: "Les données sont-elles sécurisées ?",
    answer:
      "Vos données sont hébergées en Europe et protégées par authentification sécurisée. Vous restez propriétaire de vos informations.",
  },
  {
    question: "Puis-je importer mes anciens devis ?",
    answer:
      "Vous pouvez recréer vos devis types dans Batimum et les réutiliser. L'import automatique de fichiers existants arrive prochainement.",
  },
  {
    question: "Comment fonctionne l'essai gratuit ?",
    answer:
      "7 jours gratuits, sans engagement. Testez toutes les fonctionnalités. Annulez en un clic si Batimum ne vous convient pas.",
  },
] as const;

export default function LandingLightPage() {
  return (
    <main className="landing-light relative min-h-screen overflow-x-hidden bg-[#FAFAFA] text-[#111827]">
      <LandingPageAtmosphere />
      <LandingTop />
      <LandingFeaturesSection />
      <LandingIaDemoSection />
      <LandingComparisonSection />
      <LandingPilotageSection />
      <LandingDiagnosticSection />
      <LandingTestimonialsSection />
      <LandingPricingSection />
      <LandingFaqSection faqs={faqs} variant="light" />
      <MarketingFooter variant="landing" />
    </main>
  );
}

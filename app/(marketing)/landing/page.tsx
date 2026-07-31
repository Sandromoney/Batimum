"use client";

import "./landing-emerald.css";
import { LandingTop } from "@/components/landing-top";
import { LandingScrollReset } from "@/components/landing/landing-scroll-reset";
import { LandingPainSection } from "@/components/landing/landing-pain-section";
import { LandingHubSection } from "@/components/landing/landing-hub-section";
import { LandingDiagnosticSection } from "@/components/landing/landing-diagnostic-section";
import { LandingBeforeAfterSection } from "@/components/landing/landing-before-after-section";
import { LandingJourneySection } from "@/components/landing/landing-journey-section";
import { LandingProofsSection } from "@/components/landing/landing-proofs-section";
import { LandingDevisSection } from "@/components/landing/landing-devis-section";
import { LandingTerrainSection } from "@/components/landing/landing-terrain-section";
import { LandingFeaturesSection } from "@/components/landing/landing-features-section";
import { LandingRentabilitySection } from "@/components/landing/landing-rentability-section";
import { LandingMetiersSection } from "@/components/landing/landing-metiers-section";
import { LandingVoiceSection } from "@/components/landing/landing-voice-section";
import { LandingStepsSection } from "@/components/landing/landing-steps-section";
import { LandingTestimonialsSection } from "@/components/landing/landing-testimonials-section";
import { LandingRoadmapSection } from "@/components/landing/landing-roadmap-section";
import { LandingPricingSection } from "@/components/landing/landing-pricing-section";
import { LandingFaqSection } from "@/components/landing/landing-faq-section";
import { LandingFinalCtaSection } from "@/components/landing/landing-final-cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

const faqs = [
  {
    question: "Batimum est-il réservé à un métier précis ?",
    answer:
      "Non. Batimum s’adresse aux entreprises du BTP de différents métiers : plomberie, électricité, maçonnerie, couverture, plaquisterie, carrelage, peinture, paysagisme, clim, et plus encore.",
  },
  {
    question: "Puis-je utiliser Batimum depuis mon téléphone ?",
    answer:
      "Vous pouvez déjà consulter Batimum depuis un navigateur mobile. Une expérience mobile plus poussée et un assistant vocal sont en préparation.",
  },
  {
    question: "Mes salariés peuvent-ils avoir leur propre accès ?",
    answer:
      "Oui. Les employés disposent d’un accès dédié pour retrouver planning, consignes et informations de chantier, sans exposer les données sensibles de direction.",
  },
  {
    question: "Puis-je modifier un devis créé avec MUM IA ?",
    answer:
      "Oui. MUM IA prépare une base structurée. Vous vérifiez, ajustez et validez avant l’envoi au client.",
  },
  {
    question: "Combien de devis IA puis-je créer chaque mois ?",
    answer:
      "L’offre inclut 100 devis IA par mois. Au-delà, vous continuez à créer des devis manuellement.",
  },
  {
    question: "Puis-je importer mes clients ?",
    answer:
      "Aujourd’hui, les clients s’ajoutent manuellement dans Batimum. Un import groupé n’est pas encore disponible.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer:
      "Oui. L’accès est protégé par authentification sécurisée. Vous restez propriétaire de vos informations.",
  },
  {
    question: "Puis-je résilier quand je le souhaite ?",
    answer:
      "Oui. L’offre mensuelle est sans engagement : vous pouvez annuler simplement si la solution ne vous convient pas.",
  },
  {
    question: "La facturation électronique sera-t-elle prise en charge ?",
    answer:
      "La facturation électronique fait partie de la feuille de route produit. Les évolutions seront annoncées au fur et à mesure.",
  },
  {
    question: "Combien de temps faut-il pour commencer ?",
    answer:
      "Vous pouvez créer votre compte, ajouter un client et préparer un premier devis dès le premier jour.",
  },
] as const;

export default function LandingPage() {
  return (
    <main className="landing-emerald relative min-h-screen overflow-x-hidden bg-white text-[#111111]">
      <LandingScrollReset />
      <LandingTop />
      <LandingPainSection />
      <LandingHubSection />
      <LandingDiagnosticSection />
      <LandingBeforeAfterSection />
      <LandingJourneySection />
      <LandingProofsSection />
      <LandingDevisSection />
      <LandingTerrainSection />
      <LandingFeaturesSection />
      <LandingRentabilitySection />
      <LandingMetiersSection />
      <LandingVoiceSection />
      <LandingStepsSection />
      <LandingTestimonialsSection />
      <LandingRoadmapSection />
      <LandingPricingSection />
      <LandingFaqSection faqs={faqs} />
      <LandingFinalCtaSection />
      <LandingFooter />
    </main>
  );
}

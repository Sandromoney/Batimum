"use client";

import "./landing-emerald.css";
import { LandingTop } from "@/components/landing-top";
import { LandingProofsSection } from "@/components/landing/landing-proofs-section";
import { LandingDevisSection } from "@/components/landing/landing-devis-section";
import { LandingVoiceSection } from "@/components/landing/landing-voice-section";
import { LandingTerrainSection } from "@/components/landing/landing-terrain-section";
import { LandingFeaturesSection } from "@/components/landing/landing-features-section";
import { LandingRentabilitySection } from "@/components/landing/landing-rentability-section";
import { LandingAccountSection } from "@/components/landing/landing-account-section";
import { LandingStepsSection } from "@/components/landing/landing-steps-section";
import { LandingSmsSection } from "@/components/landing/landing-sms-section";
import { LandingMarketplaceSection } from "@/components/landing/landing-marketplace-section";
import { LandingTestimonialsSection } from "@/components/landing/landing-testimonials-section";
import { LandingPricingSection } from "@/components/landing/landing-pricing-section";
import { LandingFaqSection } from "@/components/landing/landing-faq-section";
import { LandingFinalCtaSection } from "@/components/landing/landing-final-cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

const faqs = [
  {
    question: "Batimum fonctionne-t-il sur chantier ?",
    answer:
      "Oui. Vous pilotez l’activité depuis le bureau, et vos équipes retrouvent planning, consignes et chantiers depuis un téléphone.",
  },
  {
    question: "Puis-je gérer devis, factures et clients au même endroit ?",
    answer:
      "Oui. Batimum centralise clients, devis, chantiers, planning et facturation pour limiter la ressaisie.",
  },
  {
    question: "Les données sont-elles sécurisées ?",
    answer:
      "Vos données sont protégées par authentification sécurisée. Vous restez propriétaire de vos informations.",
  },
  {
    question: "Comment fonctionne l’essai gratuit ?",
    answer:
      "7 jours pour tester Batimum, sans engagement. Vous pouvez annuler simplement si la solution ne vous convient pas.",
  },
] as const;

export default function LandingPage() {
  return (
    <main className="landing-emerald relative min-h-screen overflow-x-hidden bg-white text-[#111111]">
      <LandingTop />
      <LandingProofsSection />
      <LandingDevisSection />
      <LandingVoiceSection />
      <LandingTerrainSection />
      <LandingFeaturesSection />
      <LandingRentabilitySection />
      <LandingAccountSection />
      <LandingStepsSection />
      <LandingSmsSection />
      <LandingMarketplaceSection />
      <LandingTestimonialsSection />
      <LandingPricingSection />
      <LandingFaqSection faqs={faqs} />
      <LandingFinalCtaSection />
      <LandingFooter />
    </main>
  );
}

"use client";

import "./landing-emerald.css";
import { LandingTop } from "@/components/landing-top";
import { LandingScrollReset } from "@/components/landing/landing-scroll-reset";
import { LandingPainSection } from "@/components/landing/landing-pain-section";
import { LandingHubSection } from "@/components/landing/landing-hub-section";
import { LandingDiagnosticSection } from "@/components/landing/landing-diagnostic-section";
import { LandingBeforeAfterSection } from "@/components/landing/landing-before-after-section";
import { LandingTestimonialsSection } from "@/components/landing/landing-testimonials-section";
import { LandingPricingSection } from "@/components/landing/landing-pricing-section";
import { LandingFaqSection } from "@/components/landing/landing-faq-section";
import { LandingFinalCtaSection } from "@/components/landing/landing-final-cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <main className="landing-emerald relative min-h-screen overflow-x-hidden bg-white text-[#111111]">
      <LandingScrollReset />
      <LandingTop />
      <LandingPainSection />
      <LandingHubSection />
      <LandingDiagnosticSection />
      <LandingBeforeAfterSection />
      <LandingTestimonialsSection />
      <LandingPricingSection />
      <LandingFaqSection />
      <LandingFinalCtaSection />
      <LandingFooter />
    </main>
  );
}

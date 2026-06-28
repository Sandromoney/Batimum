"use client";

import { LandingCtaLink, LandingExclusiveBadge } from "@/components/landing/landing-cta-link";
import { LandingHeroScene } from "@/components/landing/landing-hero-scene";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { useInView } from "@/lib/hooks/use-in-view";
import { getPublicSignupHref } from "@/lib/private-beta";
import { cn } from "@/lib/utils";

export function LandingEmployeePlanningSection() {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.08, once: true });

  return (
    <section
      id="exclusivite"
      ref={ref}
      className={cn(
        "landing-flagship-section mx-auto w-full max-w-7xl px-6 py-16 sm:px-8 lg:py-20 lg:px-10",
        inView && "landing-flagship-section--visible",
      )}
    >
      <div className="landing-flagship-frame">
        <div className="landing-flagship-section__inner relative z-10">
          <LandingReveal variant="title" direction="up">
            <header className="mx-auto max-w-3xl text-center">
              <LandingExclusiveBadge>EXCLUSIVITÉ BATIMUM</LandingExclusiveBadge>
              <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">
                Le premier espace employé pensé pour les entreprises du bâtiment.
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-[1.15] lg:text-[2.65rem]">
                Vos employés savent où aller.
                <br />
                Vos finances restent privées.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground/90 sm:text-base">
                Le terrain et le bureau travaillent enfin ensemble — avec deux
                accès distincts. Les équipes sont autonomes, vos devis et votre
                chiffre restent confidentiels.
              </p>
            </header>
          </LandingReveal>

          <div className="mt-10 lg:mt-12">
            <LandingHeroScene
              visible={inView}
              idPrefix="exclusivity"
              className="landing-exclusivity-scene"
            />
          </div>

          <div className="mt-10 flex justify-center lg:mt-12">
            <LandingCtaLink href={getPublicSignupHref()}>Essayer gratuitement</LandingCtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}

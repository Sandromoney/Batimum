"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  LandingReveal,
  LandingRevealItem,
  LandingRevealStagger,
} from "@/components/landing/landing-reveal";
import { cn } from "@/lib/utils";

type FaqItem = {
  question: string;
  answer: string;
};

type LandingFaqSectionProps = {
  faqs: readonly FaqItem[];
};

export function LandingFaqSection({ faqs }: LandingFaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-8 lg:px-10"
    >
      <LandingReveal variant="title">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Les questions fréquentes
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            Une question ? Notre équipe vous répond simplement, en français.
          </p>
        </header>
      </LandingReveal>

      <LandingRevealStagger
        as="ul"
        className="landing-faq-list mx-auto max-w-3xl space-y-3"
      >
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <LandingRevealItem key={faq.question} as="li">
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
                <button
                  type="button"
                  className="landing-faq-trigger flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenIndex((current) =>
                      current === index ? null : index,
                    )
                  }
                >
                  <span className="font-semibold text-foreground">
                    {faq.question}
                  </span>
                  <span
                    className={cn(
                      "landing-faq-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card-elevated/60 text-primary",
                      isOpen && "landing-faq-icon--open",
                    )}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </span>
                </button>
                <div
                  className={cn(
                    "landing-faq-panel grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-7 text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            </LandingRevealItem>
          );
        })}
      </LandingRevealStagger>
    </section>
  );
}

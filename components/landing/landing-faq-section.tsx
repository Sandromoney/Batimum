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
  variant?: "dark" | "light";
};

export function LandingFaqSection({
  faqs,
  variant = "dark",
}: LandingFaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const isLight = variant === "light";

  return (
    <section
      id="faq"
      className={cn(
        isLight ? "bg-[#FAFAFA] text-[#111111]" : "bg-[#050505] text-white",
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-8 lg:px-10">
        <LandingReveal variant="title">
          <header className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions fréquentes
            </h2>
            <p
              className={cn(
                "mt-4 text-sm leading-7 sm:text-base",
                isLight ? "text-[#555555]" : "text-[#9CA3AF]",
              )}
            >
              Réponses simples, en français.
            </p>
          </header>
        </LandingReveal>

        <LandingRevealStagger
          as="ul"
          className="mx-auto max-w-3xl space-y-3"
        >
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <LandingRevealItem key={faq.question} as="li">
                <div
                  className={cn(
                    "overflow-hidden rounded-xl border",
                    isLight
                      ? "border-[#E5E7EB] bg-white"
                      : "border-white/[0.08] bg-[#0D0D0D]",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenIndex((current) =>
                        current === index ? null : index,
                      )
                    }
                  >
                    <span className={cn("font-semibold", isLight ? "text-[#111111]" : "text-white")}>
                      {faq.question}
                    </span>
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-primary",
                        isLight
                          ? "border-[#E5E7EB] bg-[rgba(16,185,129,0.08)]"
                          : "border-white/[0.08] bg-[#111111]",
                        isOpen && "landing-faq-icon--open",
                      )}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p
                        className={cn(
                          "px-5 pb-4 text-sm leading-7",
                          isLight ? "text-[#555555]" : "text-[#9CA3AF]",
                        )}
                      >
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </LandingRevealItem>
            );
          })}
        </LandingRevealStagger>
      </div>
    </section>
  );
}

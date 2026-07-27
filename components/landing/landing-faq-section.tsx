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
  variant = "light",
}: LandingFaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const isLight = variant === "light";

  return (
    <section
      id="faq"
      className={cn(
        "lp-section",
        isLight ? "lp-section--soft text-[#101828]" : "bg-[#101828] text-white",
      )}
    >
      <div className="lp-container">
        <LandingReveal>
          <header className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="lp-title text-3xl sm:text-4xl">
              Questions fréquentes
            </h2>
          </header>
        </LandingReveal>

        <LandingRevealStagger className="mx-auto max-w-3xl space-y-3">
          {faqs.map((faq, index) => {
            const open = openIndex === index;
            return (
              <LandingRevealItem key={faq.question}>
                <div
                  className={cn(
                    "overflow-hidden rounded-2xl border",
                    isLight
                      ? "border-[#E6EAED] bg-white"
                      : "border-white/10 bg-white/5",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? null : index)}
                  >
                    <span className="font-semibold">{faq.question}</span>
                    <Plus
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform",
                        open && "rotate-45",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {open ? (
                    <div
                      className={cn(
                        "px-5 pb-4 text-sm leading-6",
                        isLight ? "text-[#667085]" : "text-white/70",
                      )}
                    >
                      {faq.answer}
                    </div>
                  ) : null}
                </div>
              </LandingRevealItem>
            );
          })}
        </LandingRevealStagger>
      </div>
    </section>
  );
}

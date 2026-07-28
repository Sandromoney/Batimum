"use client";

import { useEffect, useState } from "react";
import {
  Clock3,
  Phone,
  Files,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useInView } from "@/lib/hooks/use-in-view";
import { LandingReveal } from "@/components/landing/landing-reveal";

type PainCard = {
  id: string;
  title: string;
  text: string;
  Icon: LucideIcon;
};

const PAIN_CARDS: PainCard[] = [
  {
    id: "devis",
    title: "Vos devis prennent des heures.",
    text: "Chaque devis est une tâche répétitive qui vous fait perdre un temps précieux.",
    Icon: Clock3,
  },
  {
    id: "telephone",
    title: "Votre téléphone ne s'arrête jamais.",
    text: "Vos équipes vous appellent constamment pour obtenir des informations que vous devriez retrouver en quelques secondes.",
    Icon: Phone,
  },
  {
    id: "infos",
    title: "Vos informations sont dispersées.",
    text: "Clients. Photos. Factures. Planning. Tout est réparti entre plusieurs outils ou plusieurs personnes.",
    Icon: Files,
  },
  {
    id: "pertes",
    title: "Vous découvrez vos pertes trop tard.",
    text: "Sans visibilité en temps réel, il est difficile de savoir quels chantiers sont réellement rentables.",
    Icon: TrendingDown,
  },
];

const TITLE_SWAP_DELAY_MS = 1000;
const CARD_STAGGER_MS = 120;

function PainTitleSwap({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  const [showTime, setShowTime] = useState(false);

  useEffect(() => {
    if (!active) {
      setShowTime(false);
      return;
    }
    if (reduced) {
      setShowTime(true);
      return;
    }
    const id = window.setTimeout(() => setShowTime(true), TITLE_SWAP_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [active, reduced]);

  const phrase = showTime ? "du temps." : "des chantiers.";

  return (
    <h2 id="pain-title" className="lp-pain__title">
      <span className="lp-pain__titleLine">
        Votre entreprise ne perd pas&nbsp;
        <span className="lp-pain__swap" aria-live="polite">
          <span className="lp-pain__swapGhost" aria-hidden="true">
            des chantiers.
          </span>
          {reduced ? (
            <span className="lp-pain__swapWord">{phrase}</span>
          ) : (
            <AnimatePresence mode="sync" initial={false}>
              <motion.span
                key={phrase}
                className="lp-pain__swapWord"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                  duration: 0.42,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {phrase}
              </motion.span>
            </AnimatePresence>
          )}
        </span>
      </span>
    </h2>
  );
}

export function LandingPainSection() {
  const { ref, inView } = useInView({ once: true, threshold: 0.18 });

  return (
    <section
      ref={ref}
      className="lp-section lp-pain lp-section--after-hero"
      aria-labelledby="pain-title"
      id="quotidien"
    >
      <div className="lp-container lp-pain__inner">
        <div className="lp-pain__head">
          <LandingReveal variant="title" delay={0}>
            <PainTitleSwap active={inView} />
          </LandingReveal>

          <LandingReveal variant="body" delay={160}>
            <div className="lp-pain__subtitle">
              <p>Chaque journée ressemble souvent à la même chose.</p>
              <p>
                Des appels. Des devis. Des urgences. Des informations
                dispersées.
              </p>
              <p>
                Et toujours moins de temps pour piloter réellement votre
                entreprise.
              </p>
            </div>
          </LandingReveal>
        </div>

        <ul className="lp-pain__grid" role="list">
          {PAIN_CARDS.map((card, index) => {
            const Icon = card.Icon;
            return (
              <LandingReveal
                key={card.id}
                as="li"
                className="lp-pain__cardReveal"
                delay={280 + index * CARD_STAGGER_MS}
              >
                <article className="lp-pain__card">
                  <span className="lp-pain__icon" aria-hidden="true">
                    <Icon size={22} strokeWidth={1.7} />
                  </span>
                  <h3 className="lp-pain__cardTitle">{card.title}</h3>
                  <p className="lp-pain__cardText">{card.text}</p>
                </article>
              </LandingReveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

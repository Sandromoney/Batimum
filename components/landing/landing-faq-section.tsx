"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

type FaqItem = {
  question: string;
  answer: ReactNode;
};

const FAQS: FaqItem[] = [
  {
    question: "Est-ce que Batimum est adapté à une petite entreprise ?",
    answer: (
      <>
        <p>Oui.</p>
        <p>
          Batimum a été conçu en priorité pour les TPE du BTP. Que vous soyez
          seul, avec quelques salariés ou une petite équipe, toutes les
          fonctionnalités restent accessibles et simples à utiliser.
        </p>
      </>
    ),
  },
  {
    question:
      "Mes salariés auront-ils accès à toutes les informations de l’entreprise ?",
    answer: (
      <>
        <p>Non.</p>
        <p>
          Chaque salarié possède un espace employé totalement séparé. Ils
          accèdent uniquement :
        </p>
        <ul>
          <li>à leur planning ;</li>
          <li>à leurs chantiers ;</li>
          <li>à leurs consignes.</li>
        </ul>
        <p>
          Les devis, les marges, les clients, les coûts et les informations
          sensibles restent exclusivement accessibles au dirigeant.
        </p>
      </>
    ),
  },
  {
    question: "Faut-il être à l’aise avec l’informatique ?",
    answer: (
      <>
        <p>Non.</p>
        <p>
          Batimum a été pensé pour être simple. L’objectif est de vous faire
          gagner du temps, pas de vous faire apprendre un logiciel compliqué.
        </p>
      </>
    ),
  },
  {
    question: "Puis-je essayer Batimum gratuitement ?",
    answer: (
      <>
        <p>Oui.</p>
        <p>
          Vous bénéficiez de 7 jours d’essai afin de découvrir toutes les
          fonctionnalités.
        </p>
      </>
    ),
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: (
      <>
        <p>Oui.</p>
        <p>
          Vos données sont protégées et hébergées de manière sécurisée.
        </p>
      </>
    ),
  },
  {
    question: "Puis-je résilier quand je le souhaite ?",
    answer: (
      <>
        <p>Oui, si vous choisissez l’offre mensuelle.</p>
        <p>
          L’offre annuelle bénéficie d’un tarif réduit en échange d’un
          engagement.
        </p>
      </>
    ),
  },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function LandingFaqSection() {
  const reduced = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="lp-section lp-faq"
      aria-labelledby="faq-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head lp-faq__head">
            <p className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              FAQ
            </p>
            <h2 id="faq-title" className="lp-title lp-faq__title">
              Les questions que se posent{" "}
              <span className="lp-title-accent">les dirigeants</span>
            </h2>
            <p className="lp-subtitle lp-faq__lead">
              Les réponses essentielles avant de créer votre compte.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-faq__shell">
        <div className="lp-faq__list">
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <LandingReveal key={faq.question} delay={40 + index * 40}>
                <div
                  className={[
                    "lp-faq__item",
                    open ? "is-open" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <button
                    type="button"
                    id={`faq-trigger-${index}`}
                    className="lp-faq__trigger"
                    aria-expanded={open}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpenIndex(open ? null : index)}
                  >
                    <span className="lp-faq__question">{faq.question}</span>
                    <span className="lp-faq__icon" aria-hidden="true">
                      <Plus
                        size={16}
                        strokeWidth={2.2}
                        className={open ? "is-open" : ""}
                      />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        id={`faq-panel-${index}`}
                        role="region"
                        aria-labelledby={`faq-trigger-${index}`}
                        className="lp-faq__panel"
                        initial={
                          reduced
                            ? false
                            : { height: 0, opacity: 0 }
                        }
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          duration: reduced ? 0.01 : 0.32,
                          ease: EASE,
                        }}
                      >
                        <div className="lp-faq__answer">{faq.answer}</div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </LandingReveal>
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}

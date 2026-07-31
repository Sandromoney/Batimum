"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ClipboardList,
  HardHat,
  LineChart,
  Users,
  FileText,
  Calendar,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import {
  collectPains,
  PAIN_LABELS,
  QUESTIONS,
  type PainId,
} from "@/lib/landing-diagnostic";

const PAIN_ICONS: Record<PainId, typeof FileText> = {
  devis: FileText,
  equipes: Calendar,
  chantiers: HardHat,
  rentabilite: LineChart,
  admin: ClipboardList,
  clients: Users,
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function LandingDiagnosticSection() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    {},
  );
  const [multiDraft, setMultiDraft] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const total = QUESTIONS.length;
  const question = QUESTIONS[step];
  const progressLabel = done
    ? "Diagnostic terminé"
    : `Question ${step + 1} sur ${total}`;
  const progressRatio = done ? 1 : (step + 1) / total;

  const pains = useMemo(() => collectPains(answers), [answers]);

  const goNext = useCallback(
    (nextAnswers: Record<string, string | string[]>) => {
      if (step >= total - 1) {
        setAnswers(nextAnswers);
        setPicked(null);
        setDone(true);
        return;
      }
      setAnswers(nextAnswers);
      setMultiDraft([]);
      setPicked(null);
      setStep((s) => s + 1);
    },
    [step, total],
  );

  const selectSingle = (optionId: string) => {
    if (!question || question.kind !== "single" || done || picked) return;
    setPicked(optionId);
    const next = { ...answers, [question.id]: optionId };
    window.setTimeout(() => goNext(next), reduced ? 0 : 240);
  };

  const toggleMulti = (optionId: string) => {
    setMultiDraft((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId],
    );
  };

  const confirmMulti = () => {
    if (!question || question.kind !== "multi") return;
    if (multiDraft.length < (question.minSelect ?? 1)) return;
    goNext({ ...answers, [question.id]: multiDraft });
  };

  const scrollToSolutions = () => {
    const el = document.getElementById("avant-apres");
    if (!el) return;
    const headerOffset = 88;
    const top =
      el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setMultiDraft([]);
    setPicked(null);
    setDone(false);
  };

  const t = {
    duration: reduced ? 0.01 : 0.42,
    ease: EASE,
  };

  return (
    <section
      className="lp-section lp-diag"
      id="diagnostic"
      aria-labelledby="diagnostic-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head lp-diag__head">
            <p className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Mini-audit Batimum
            </p>
            <h2 id="diagnostic-title" className="lp-title mt-5 max-w-3xl">
              En moins d’une minute, voyez où votre entreprise{" "}
              <span className="lp-title-accent">perd le plus de temps.</span>
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Répondez à quelques questions simples. Batimum repère vos habitudes
              de travail et met en lumière les points où vous pouvez gagner du
              temps dès demain.
            </p>
          </div>
        </LandingReveal>

        <LandingReveal delay={100}>
          <div className="lp-diag__shell">
            <div className="lp-diag__progress" aria-hidden="true">
              <div className="lp-diag__progressMeta">
                <span>{progressLabel}</span>
                <span>{Math.round(progressRatio * 100)}%</span>
              </div>
              <div className="lp-diag__progressTrack">
                <motion.div
                  className="lp-diag__progressFill"
                  initial={false}
                  animate={{
                    scaleX: Math.max(0.06, progressRatio),
                  }}
                  transition={t}
                  style={{ transformOrigin: "left center" }}
                />
              </div>
            </div>

            <div className="lp-diag__stage" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {!done && question ? (
                  <motion.div
                    key={question.id}
                    className="lp-diag__card"
                    initial={reduced ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={t}
                  >
                    <p className="lp-diag__prompt">{question.prompt}</p>
                    {question.hint ? (
                      <p className="lp-diag__hint">{question.hint}</p>
                    ) : null}

                    <div
                      className={[
                        "lp-diag__options",
                        question.kind === "multi" ? "is-multi" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      role={question.kind === "multi" ? "group" : "listbox"}
                      aria-label={question.prompt}
                    >
                      {question.options.map((opt) => {
                        const selected =
                          question.kind === "multi"
                            ? multiDraft.includes(opt.id)
                            : picked === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={[
                              "lp-diag__option",
                              selected ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            disabled={
                              question.kind === "single" && Boolean(picked)
                            }
                            onClick={() => {
                              if (question.kind === "single") {
                                selectSingle(opt.id);
                              } else {
                                toggleMulti(opt.id);
                              }
                            }}
                          >
                            <span className="lp-diag__optionLabel">
                              {opt.label}
                            </span>
                            {question.kind === "multi" ? (
                              <span
                                className={[
                                  "lp-diag__check",
                                  selected ? "is-on" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                aria-hidden="true"
                              >
                                <Check size={14} strokeWidth={2.2} />
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {question.kind === "multi" ? (
                      <div className="lp-diag__actions">
                        <button
                          type="button"
                          className="landing-btn-primary landing-btn-interactive lp-diag__continue"
                          disabled={
                            multiDraft.length < (question.minSelect ?? 1)
                          }
                          onClick={confirmMulti}
                        >
                          Continuer
                          <ArrowRight size={16} aria-hidden="true" />
                        </button>
                      </div>
                    ) : null}
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    className="lp-diag__card lp-diag__card--result"
                    initial={reduced ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={t}
                  >
                    <p className="lp-diag__resultEyebrow">Votre diagnostic.</p>
                    <h3 className="lp-diag__resultTitle">
                      Batimum a identifié les principaux points sur lesquels
                      votre entreprise pourrait gagner du temps.
                    </h3>
                    <ul className="lp-diag__pains">
                      {pains.map((id, index) => {
                        const Icon = PAIN_ICONS[id];
                        return (
                          <motion.li
                            key={id}
                            className="lp-diag__pain"
                            initial={
                              reduced ? false : { opacity: 0, x: -8 }
                            }
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              ...t,
                              delay: reduced ? 0 : 0.08 + index * 0.06,
                            }}
                          >
                            <span className="lp-diag__painIcon" aria-hidden>
                              <Check size={15} strokeWidth={2.2} />
                            </span>
                            <span className="lp-diag__painLabel">
                              {PAIN_LABELS[id]}
                            </span>
                            <span className="lp-diag__painGlyph" aria-hidden>
                              <Icon size={15} strokeWidth={1.7} />
                            </span>
                          </motion.li>
                        );
                      })}
                    </ul>
                    <p className="lp-diag__resultLead">
                      Découvrez comment Batimum règle chacun de ces problèmes.
                    </p>
                    <div className="lp-diag__resultCtas">
                      <button
                        type="button"
                        className="landing-btn-primary landing-btn-interactive group inline-flex items-center justify-center gap-2"
                        onClick={scrollToSolutions}
                      >
                        Voir les solutions Batimum
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        className="lp-diag__restart"
                        onClick={restart}
                      >
                        Refaire le diagnostic
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

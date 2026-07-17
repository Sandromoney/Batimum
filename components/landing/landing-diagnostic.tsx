"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { LandingCtaLink } from "@/components/landing/landing-cta-link";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { Card } from "@/components/ui/card";
import { getPublicSignupHref } from "@/lib/private-beta";
import { cn } from "@/lib/utils";

type DifficultyId =
  | "employee-calls"
  | "re-entry"
  | "chantier-profitability"
  | "employee-profitability"
  | "planning"
  | "devis-facturation"
  | "excel"
  | "chantier-visibility"
  | "employee-space"
  | "other";

type SingleQuestion = {
  type: "single";
  question: string;
  options: readonly string[];
};

type MultiQuestion = {
  type: "multi";
  question: string;
  options: readonly { id: DifficultyId; label: string }[];
};

type Question = SingleQuestion | MultiQuestion;

const DIFFICULTY_BENEFITS: Record<
  DifficultyId,
  { title: string; description: string }
> = {
  "employee-calls": {
    title: "Planning terrain connecté au bureau",
    description:
      "Vos équipes consultent leurs chantiers et consignes sans vous appeler chaque matin.",
  },
  "re-entry": {
    title: "Devis → chantier → facture automatisé",
    description:
      "Une information saisie une fois se propage dans tout le flux, sans ressaisie.",
  },
  "chantier-profitability": {
    title: "Déboursés et rentabilité par chantier",
    description:
      "Suivez vos marges chantier par chantier en temps réel, sans calculs Excel.",
  },
  "employee-profitability": {
    title: "Rentabilité par employé",
    description:
      "Identifiez quels collaborateurs sont réellement rentables pour votre entreprise.",
  },
  planning: {
    title: "Planning terrain synchronisé",
    description:
      "Le bureau et le terrain partagent le même planning, mis à jour en temps réel.",
  },
  "devis-facturation": {
    title: "IA devis et facturation intégrées",
    description:
      "Générez vos devis plus vite et passez à la facture avec signature électronique incluse.",
  },
  excel: {
    title: "Pilotage sans tableurs",
    description:
      "Centralisez devis, chantiers, équipes et marges dans une seule plateforme.",
  },
  "chantier-visibility": {
    title: "Suivi d'avancement chantier",
    description:
      "Visualisez l'état de chaque chantier sans fouiller vos messages ou vos papiers.",
  },
  "employee-space": {
    title: "Espace employé totalement séparé",
    description:
      "Chaque salarié accède à son planning et ses consignes, sans voir vos chiffres.",
  },
  other: {
    title: "Une plateforme 100 % BTP",
    description:
      "Batimum est conçu pour les dirigeants de TPE du bâtiment, pas pour un usage généraliste.",
  },
};

const GENERIC_BENEFITS = [
  DIFFICULTY_BENEFITS["re-entry"],
  DIFFICULTY_BENEFITS.planning,
  DIFFICULTY_BENEFITS["employee-space"],
];

const QUESTIONS: Question[] = [
  {
    type: "single",
    question: "Combien de personnes travaillent dans votre entreprise ?",
    options: [
      "Je travaille seul",
      "2 à 5 employés",
      "6 à 10 employés",
      "Plus de 10 employés",
    ],
  },
  {
    type: "single",
    question:
      "Vous ressaisissez les mêmes informations entre le devis, le planning et la facture ?",
    options: ["Tous les jours", "Régulièrement", "Rarement", "Jamais"],
  },
  {
    type: "single",
    question: "Savez-vous réellement combien vous rapporte chaque chantier ?",
    options: [
      "Oui, précisément",
      "À peu près",
      "Je fais mes calculs sur Excel",
      "Non, je ne le sais pas vraiment",
    ],
  },
  {
    type: "single",
    question:
      "Vos employés savent-ils toujours où aller et quoi faire sans vous appeler ?",
    options: ["Oui, toujours", "Souvent", "Parfois", "Non, jamais"],
  },
  {
    type: "single",
    question: "Combien de temps passez-vous chaque semaine sur l'administratif ?",
    options: [
      "Moins de 5 heures",
      "Entre 5 et 10 heures",
      "Entre 10 et 20 heures",
      "Plus de 20 heures",
    ],
  },
  {
    type: "single",
    question:
      "Comment suivez-vous aujourd'hui la rentabilité de votre entreprise ?",
    options: [
      "Directement dans mon logiciel",
      "Avec Excel",
      "De tête ou sur papier",
      "Je ne la suis pas réellement",
    ],
  },
  {
    type: "multi",
    question: "Quelles sont aujourd'hui vos plus grandes difficultés ?",
    options: [
      {
        id: "employee-calls",
        label: "Mes employés m'appellent constamment pour savoir où aller",
      },
      {
        id: "re-entry",
        label: "Je ressaisis plusieurs fois les mêmes informations",
      },
      {
        id: "chantier-profitability",
        label: "Je ne connais pas précisément ma rentabilité chantier par chantier",
      },
      {
        id: "employee-profitability",
        label: "Je ne sais pas quel employé est réellement rentable",
      },
      {
        id: "planning",
        label: "Mon planning est difficile à gérer",
      },
      {
        id: "devis-facturation",
        label: "Je perds du temps sur les devis et la facturation",
      },
      {
        id: "excel",
        label: "Je travaille encore beaucoup avec Excel",
      },
      {
        id: "chantier-visibility",
        label: "Je manque de visibilité sur l'avancement des chantiers",
      },
      {
        id: "employee-space",
        label: "Je n'ai pas d'espace dédié pour mes employés",
      },
      {
        id: "other",
        label: "Autre",
      },
    ],
  },
];

type DiagnosticResult = {
  title: string;
  text: string;
  benefits: { title: string; description: string }[];
};

function buildPersonalizedResult(
  selectedDifficulties: DifficultyId[],
): DiagnosticResult {
  const specificIds = selectedDifficulties.filter((id) => id !== "other");
  const ids =
    specificIds.length > 0
      ? specificIds
      : selectedDifficulties.includes("other")
        ? (["other"] as DifficultyId[])
        : [];

  const benefits =
    ids.length > 0
      ? ids.map((id) => DIFFICULTY_BENEFITS[id])
      : GENERIC_BENEFITS;

  const uniqueBenefits = benefits.filter(
    (benefit, index, list) =>
      list.findIndex((item) => item.title === benefit.title) === index,
  );

  if (uniqueBenefits.length === 1) {
    const benefit = uniqueBenefits[0];
    return {
      title: "Batimum répond à votre priorité du quotidien.",
      text: benefit.description,
      benefits: uniqueBenefits,
    };
  }

  if (uniqueBenefits.length > 1) {
    return {
      title: `Batimum cible ${uniqueBenefits.length} de vos difficultés concrètes.`,
      text: "Voici les réponses que Batimum apporte aux problèmes que vous venez d'identifier — pas un logiciel générique, mais un outil pensé pour les dirigeants du bâtiment.",
      benefits: uniqueBenefits,
    };
  }

  return {
    title: "Batimum simplifie le quotidien des dirigeants du bâtiment.",
    text: "Devis, planning, équipes, rentabilité et facturation réunis dans une seule plateforme pensée pour les TPE du BTP.",
    benefits: GENERIC_BENEFITS,
  };
}

const ADVANCE_DELAY_MS = 420;

export function LandingDiagnosticSection({
  afterHero = false,
}: {
  afterHero?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<
    DifficultyId[]
  >([]);
  const [multiDraft, setMultiDraft] = useState<DifficultyId[]>([]);
  const [phase, setPhase] = useState<"question" | "result">("question");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [panelKey, setPanelKey] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const totalSteps = QUESTIONS.length;
  const current = QUESTIONS[step];
  const isMultiStep = current.type === "multi";

  const progress =
    phase === "result"
      ? 100
      : isMultiStep
        ? ((step + (multiDraft.length > 0 ? 0.85 : 0.35)) / totalSteps) * 100
        : ((step + (selectedOption !== null ? 0.65 : 0.25)) / totalSteps) *
          100;

  const result =
    phase === "result"
      ? buildPersonalizedResult(selectedDifficulties)
      : null;

  const finishDiagnostic = useCallback((difficulties: DifficultyId[]) => {
    setSelectedDifficulties(difficulties);
    setIsExiting(true);
    window.setTimeout(() => {
      setPhase("result");
      setSelectedOption(null);
      setIsExiting(false);
      setPanelKey((key) => key + 1);
    }, ADVANCE_DELAY_MS);
  }, []);

  const advanceSingle = useCallback(
    (answerIndex: number) => {
      const nextAnswers = [...answers, answerIndex];
      setAnswers(nextAnswers);
      setIsExiting(true);

      window.setTimeout(() => {
        setStep((currentStep) => currentStep + 1);
        setSelectedOption(null);
        setIsExiting(false);
        setPanelKey((key) => key + 1);
      }, ADVANCE_DELAY_MS);
    },
    [answers],
  );

  function handleSingleAnswer(answerIndex: number) {
    if (selectedOption !== null) return;
    setSelectedOption(answerIndex);
    window.setTimeout(() => advanceSingle(answerIndex), ADVANCE_DELAY_MS);
  }

  function handleMultiToggle(id: DifficultyId) {
    setMultiDraft((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function handleMultiSubmit() {
    if (multiDraft.length === 0 || isExiting) return;
    finishDiagnostic(multiDraft);
  }

  return (
    <section
      id="diagnostic"
      className={cn(
        "landing-section-glow mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10",
        afterHero ? "pb-14 pt-10 sm:pb-16 sm:pt-12" : "py-16",
      )}
    >
      <LandingReveal variant="title" className="relative z-10">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Prenez 30 secondes pour savoir si Batimum est fait pour votre
            entreprise.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            Répondez à quelques questions simples et découvrez comment Batimum
            peut vous faire gagner du temps au quotidien.
          </p>
        </header>

        <Card className="landing-card-interactive landing-diagnostic mx-auto max-w-2xl border-border/70 bg-card-elevated/50 p-6 sm:p-8">
          <div className="mb-6">
            <p className="mb-2 text-left text-xs text-muted-foreground">
              {phase === "result"
                ? "Votre synthèse"
                : `Question ${step + 1} / ${totalSteps}`}
            </p>
            <div className="landing-diagnostic__progress-track h-1 overflow-hidden rounded-full bg-border/60">
              <div
                className="landing-diagnostic__progress h-full rounded-full bg-primary/80"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={
                  phase === "result"
                    ? "Diagnostic terminé"
                    : `Progression du questionnaire, question ${step + 1} sur ${totalSteps}`
                }
              />
            </div>
          </div>

          <div className="relative min-h-[280px] overflow-hidden sm:min-h-[300px]">
            {phase === "result" && result ? (
              <div
                key={`result-${panelKey}`}
                className="landing-diagnostic__result landing-diagnostic__result--visible"
              >
                <p className="landing-diagnostic__result-eyebrow text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Diagnostic métier
                </p>
                <h3 className="landing-diagnostic__result-title mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {result.title}
                </h3>
                <p className="landing-diagnostic__result-text mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                  {result.text}
                </p>
                <ul className="mt-6 space-y-3">
                  {result.benefits.map((benefit, index) => (
                    <li
                      key={benefit.title}
                      className="landing-diagnostic__result-point"
                      style={{ "--point-delay": index } as CSSProperties}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground/90">
                            {benefit.title}
                          </p>
                          <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="landing-diagnostic__result-cta mt-10 flex justify-center">
                  <LandingCtaLink href={getPublicSignupHref()}>
                    Essayer gratuitement — 7 jours
                  </LandingCtaLink>
                </div>
              </div>
            ) : (
              <div
                key={`question-${panelKey}`}
                className={cn(
                  "landing-diagnostic__panel",
                  !isExiting && "landing-diagnostic__panel--enter",
                  isExiting && "landing-diagnostic__panel--exit",
                )}
              >
                <p className="landing-diagnostic__question text-lg font-medium leading-8 text-foreground">
                  {current.question}
                </p>

                {current.type === "multi" ? (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Sélectionnez une ou plusieurs réponses.
                    </p>
                    <ul
                      className="mt-5 space-y-2.5"
                      role="group"
                      aria-label={current.question}
                    >
                      {current.options.map((option) => {
                        const isSelected = multiDraft.includes(option.id);

                        return (
                          <li key={option.id}>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={isSelected}
                              disabled={isExiting}
                              className={cn(
                                "landing-diagnostic__option w-full rounded-xl border border-border/70 bg-card/80 px-4 py-3.5 text-left text-sm font-medium text-foreground transition-all duration-300",
                                isSelected &&
                                  "landing-diagnostic__option--selected border-primary/55 bg-primary/10",
                              )}
                              onClick={() => handleMultiToggle(option.id)}
                            >
                              <span className="flex items-start gap-3">
                                <span
                                  className={cn(
                                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border/80 bg-background",
                                  )}
                                  aria-hidden="true"
                                >
                                  {isSelected ? (
                                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                  ) : null}
                                </span>
                                <span className="leading-6">{option.label}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-6 flex flex-col items-stretch gap-2 sm:items-end">
                      {multiDraft.length === 0 ? (
                        <p className="text-xs text-muted-foreground sm:text-right">
                          Choisissez au moins une difficulté pour voir vos
                          résultats.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        disabled={multiDraft.length === 0 || isExiting}
                        className="landing-btn-primary landing-btn-interactive inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
                        onClick={handleMultiSubmit}
                      >
                        Voir mes résultats
                      </button>
                    </div>
                  </>
                ) : (
                  <ul
                    className="mt-6 space-y-3"
                    role="listbox"
                    aria-label={current.question}
                  >
                    {current.options.map((option, index) => {
                      const isSelected = selectedOption === index;

                      return (
                        <li key={option}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            disabled={selectedOption !== null && !isSelected}
                            className={cn(
                              "landing-diagnostic__option w-full rounded-xl border border-border/70 bg-card/80 px-4 py-3.5 text-left text-sm font-medium text-foreground transition-all duration-300",
                              isSelected &&
                                "landing-diagnostic__option--selected border-primary/55 bg-primary/10",
                              selectedOption !== null &&
                                !isSelected &&
                                "opacity-45",
                            )}
                            onClick={() => handleSingleAnswer(index)}
                          >
                            <span className="flex items-center justify-between gap-3">
                              {option}
                              {isSelected ? (
                                <span
                                  className="landing-diagnostic__option-check flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                  aria-hidden="true"
                                >
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Card>
      </LandingReveal>
    </section>
  );
}

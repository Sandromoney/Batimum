"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import {
  LandingCtaLink,
} from "@/components/landing/landing-cta-link";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { Card } from "@/components/ui/card";
import { getPublicSignupHref } from "@/lib/private-beta";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  {
    question:
      "Vos employés vous appellent encore le matin pour demander où ils doivent aller ?",
    options: ["Tous les jours", "De temps en temps", "Jamais"],
  },
  {
    question:
      "Vous ressaisissez les mêmes informations entre le devis, le planning et la facture ?",
    options: ["Tout le temps", "Parfois", "Non"],
  },
  {
    question:
      "Combien de temps passez-vous chaque semaine sur l'administratif ?",
    options: [
      "Plus de 10 heures",
      "Entre 5 et 10 heures",
      "Moins de 5 heures",
    ],
  },
  {
    question:
      "Vos employés ont-ils accès à des informations qu'ils ne devraient pas voir ?",
    options: ["Oui", "Ça m'est déjà arrivé", "Non"],
  },
  {
    question:
      "Quand un chantier change, combien de personnes devez-vous prévenir manuellement ?",
    options: [
      "Toute l'équipe",
      "Quelques personnes",
      "Personne, tout est déjà organisé",
    ],
  },
  {
    question:
      "Avez-vous déjà oublié de facturer un travail réalisé ou perdu du temps à retrouver une information ?",
    options: ["Oui, plusieurs fois", "Une ou deux fois", "Jamais"],
  },
  {
    question: "Quel est aujourd'hui votre plus gros problème ?",
    options: [
      "Le temps perdu au bureau",
      "L'organisation des équipes",
      "Les devis et la facturation",
      "Le manque de visibilité sur les chantiers",
    ],
  },
] as const;

type ResultProfile = "admin" | "teams" | "mixed";

const RESULTS: Record<
  ResultProfile,
  { title: string; text: string; points: readonly string[] }
> = {
  admin: {
    title: "Vous pourriez récupérer plusieurs heures chaque mois.",
    text: "Batimum automatise vos devis, votre planning et votre facturation afin d'éviter les doubles saisies et le temps perdu sur l'administratif.",
    points: [
      "IA devis automatique",
      "Zéro ressaisie",
      "Facturation simplifiée",
    ],
  },
  teams: {
    title: "Vos équipes gagneraient en autonomie.",
    text: "Grâce à l'espace employé Batimum, chacun connaît son chantier, ses consignes et ses documents sans avoir accès à vos finances ou à vos devis.",
    points: [
      "Espace employé séparé",
      "Planning terrain",
      "Notifications automatiques",
    ],
  },
  mixed: {
    title: "Batimum semble parfaitement adapté à votre entreprise.",
    text: "Vous perdez actuellement du temps sur l'administratif, la communication interne et l'organisation terrain. Batimum réunit tout dans un seul outil pensé pour les artisans du bâtiment.",
    points: [
      "IA devis",
      "Planning équipes",
      "Zéro double saisie",
      "Accès employés distincts",
    ],
  },
};

const ADVANCE_DELAY_MS = 420;

function scoreAnswer(questionIndex: number, answerIndex: number) {
  const pain = Math.max(0, 2 - answerIndex);

  if (questionIndex === 0) return { admin: 0, teams: pain };
  if (questionIndex === 1) return { admin: pain, teams: 0 };
  if (questionIndex === 2) return { admin: pain * 1.5, teams: 0 };
  if (questionIndex === 3) return { admin: 0, teams: pain };
  if (questionIndex === 4) return { admin: 0, teams: pain };
  if (questionIndex === 5) return { admin: pain, teams: 0 };

  if (answerIndex === 0 || answerIndex === 2) return { admin: 4, teams: 0 };
  if (answerIndex === 1 || answerIndex === 3) return { admin: 0, teams: 4 };
  return { admin: 0, teams: 0 };
}

function computeResult(answers: number[]): ResultProfile {
  let admin = 0;
  let teams = 0;

  answers.forEach((answerIndex, questionIndex) => {
    const scores = scoreAnswer(questionIndex, answerIndex);
    admin += scores.admin;
    teams += scores.teams;
  });

  const mainProblem = answers[6] ?? 0;
  const adminHigh = admin >= 5;
  const teamsHigh = teams >= 5;

  if (adminHigh && teamsHigh) return "mixed";
  if (adminHigh) return "admin";
  if (teamsHigh) return "teams";

  if (mainProblem === 0 || mainProblem === 2) return "admin";
  if (mainProblem === 1 || mainProblem === 3) return "teams";

  if (admin + teams >= 4) return "mixed";
  return teams > admin ? "teams" : "admin";
}

export function LandingDiagnosticSection({
  afterHero = false,
}: {
  afterHero?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [phase, setPhase] = useState<"question" | "result">("question");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [panelKey, setPanelKey] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const totalSteps = QUESTIONS.length;
  const progress =
    phase === "result"
      ? 100
      : ((step + (selectedOption !== null ? 0.65 : 0.25)) / totalSteps) * 100;

  const resultProfile =
    phase === "result" ? computeResult(answers) : null;
  const result = resultProfile ? RESULTS[resultProfile] : null;

  const advance = useCallback(
    (answerIndex: number) => {
      const nextAnswers = [...answers, answerIndex];

      if (step >= totalSteps - 1) {
        setAnswers(nextAnswers);
        setIsExiting(true);
        window.setTimeout(() => {
          setPhase("result");
          setSelectedOption(null);
          setIsExiting(false);
          setPanelKey((key) => key + 1);
        }, ADVANCE_DELAY_MS);
        return;
      }

      setAnswers(nextAnswers);
      setIsExiting(true);

      window.setTimeout(() => {
        setStep((current) => current + 1);
        setSelectedOption(null);
        setIsExiting(false);
        setPanelKey((key) => key + 1);
      }, ADVANCE_DELAY_MS);
    },
    [answers, step, totalSteps],
  );

  function handleAnswer(answerIndex: number) {
    if (selectedOption !== null) return;
    setSelectedOption(answerIndex);
    window.setTimeout(() => advance(answerIndex), ADVANCE_DELAY_MS);
  }

  const current = QUESTIONS[step];

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
                <ul className="mt-6 space-y-2.5">
                  {result.points.map((point, index) => (
                    <li
                      key={point}
                      className="landing-diagnostic__result-point flex items-center gap-2.5 text-sm text-foreground/90"
                      style={
                        {
                          "--point-delay": index,
                        } as CSSProperties
                      }
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                      {point}
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
                <ul className="mt-6 space-y-3" role="listbox" aria-label={current.question}>
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
                          onClick={() => handleAnswer(index)}
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
              </div>
            )}
          </div>
        </Card>
      </LandingReveal>
    </section>
  );
}

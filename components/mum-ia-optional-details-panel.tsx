"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AiChantierAnalysis, AiChantierQuestion } from "@/lib/ai-devis-analysis";
import {
  countMumIaOptionalDetails,
  groupQuestionsByCategory,
  MUM_IA_ACCES_CHANTIER_OPTIONS,
  type MumIaStandardDetails,
} from "@/lib/mum-ia-optional-details";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, Loader2, Wand2 } from "lucide-react";

type MumIaOptionalDetailsPanelProps = {
  analysis: AiChantierAnalysis;
  standardDetails: MumIaStandardDetails;
  onStandardDetailsChange: (patch: Partial<MumIaStandardDetails>) => void;
  questionAnswers: Record<string, string>;
  onQuestionAnswerChange: (id: string, value: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  loading: boolean;
  onGenerateWithDetails: () => void;
  onGenerateWithHypotheses: () => void;
};

function DynamicQuestionField({
  question,
  value,
  onChange,
}: {
  question: AiChantierQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  if (question.type === "choice" && question.options && question.options.length > 0) {
    return (
      <div
        className={cn(
          "mum-ia-optional-details__segmented",
          question.options.length === 4 && "mum-ia-optional-details__segmented--quad",
          question.options.length === 2 && "mum-ia-optional-details__segmented--duo",
        )}
      >
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "mum-ia-optional-details__segment",
              value === option && "mum-ia-optional-details__segment--active",
            )}
            onClick={() => onChange(value === option ? "" : option)}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        placeholder={question.placeholder ?? "Précision (facultatif)"}
        className="mum-ia-optional-details__textarea"
      />
    );
  }

  if (question.type === "number") {
    return (
      <div className="relative">
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={question.placeholder ?? ""}
          className={question.unite ? "pr-10" : undefined}
        />
        {question.unite ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">
            {question.unite}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={question.placeholder ?? "Précision (facultatif)"}
    />
  );
}

export function MumIaOptionalDetailsPanel({
  analysis,
  standardDetails,
  onStandardDetailsChange,
  questionAnswers,
  onQuestionAnswerChange,
  expanded,
  onExpandedChange,
  loading,
  onGenerateWithDetails,
  onGenerateWithHypotheses,
}: MumIaOptionalDetailsPanelProps) {
  const detailsCount = countMumIaOptionalDetails(analysis);
  const groupedQuestions = groupQuestionsByCategory(analysis.questions);

  return (
    <div className="mum-ia-optional-details">
      <div className="mum-ia-optional-details__header">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Analyse terminée
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Jusqu&apos;à {detailsCount} précision{detailsCount > 1 ? "s" : ""}{" "}
              utile{detailsCount > 1 ? "s" : ""} au devis (facultatif
              {detailsCount > 1 ? "s" : ""}).
            </p>
            {analysis.messageAnalyse ? (
              <p className="text-xs leading-relaxed text-muted-foreground/90">
                {analysis.messageAnalyse}
              </p>
            ) : null}
            {analysis.lotsIdentifies.length > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Lots identifiés :{" "}
                <span className="text-foreground/90">
                  {analysis.lotsIdentifies.join(" · ")}
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="mum-ia-optional-details__toggle"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
        >
          <span>
            {expanded
              ? "Masquer les précisions utiles au devis"
              : "Voir les précisions utiles au devis"}
          </span>
          <ChevronDown
            className={cn(
              "mum-ia-optional-details__chevron h-4 w-4 shrink-0",
              expanded && "mum-ia-optional-details__chevron--open",
            )}
            aria-hidden
          />
        </button>
      </div>

      <div
        className={cn(
          "mum-ia-optional-details__collapse",
          expanded && "mum-ia-optional-details__collapse--open",
        )}
      >
        <div className="mum-ia-optional-details__collapse-inner">
          <div className="mum-ia-optional-details__fields">
            <p className="mum-ia-optional-details__section-title">
              Détails complémentaires (facultatifs)
            </p>
            <p className="mum-ia-optional-details__hint">
              Uniquement des informations qui peuvent figurer sur le devis final.
              Laissez vide ce que vous ne connaissez pas encore.
            </p>

            <label className="mum-ia-optional-details__field">
              <span className="mum-ia-optional-details__label">
                Surface exacte à confirmer
              </span>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex. 42"
                  value={standardDetails.surfaceM2}
                  onChange={(event) =>
                    onStandardDetailsChange({ surfaceM2: event.target.value })
                  }
                  className="pr-10"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">
                  m²
                </span>
              </div>
            </label>

            <label className="mum-ia-optional-details__field">
              <span className="mum-ia-optional-details__label">Hauteur sous plafond</span>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="2,50"
                  value={standardDetails.hauteurSousPlafond}
                  onChange={(event) =>
                    onStandardDetailsChange({
                      hauteurSousPlafond: event.target.value,
                    })
                  }
                  className="pr-10"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">
                  m
                </span>
              </div>
            </label>

            <label className="mum-ia-optional-details__field">
              <span className="mum-ia-optional-details__label">
                Nombre de fenêtres / portes
              </span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Ex. 2"
                value={standardDetails.nombreFenetresPortes}
                onChange={(event) =>
                  onStandardDetailsChange({
                    nombreFenetresPortes: event.target.value,
                  })
                }
              />
            </label>

            <fieldset className="mum-ia-optional-details__field">
              <legend className="mum-ia-optional-details__label">Accès chantier</legend>
              <div className="mum-ia-optional-details__segmented mum-ia-optional-details__segmented--quad">
                {MUM_IA_ACCES_CHANTIER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "mum-ia-optional-details__segment",
                      standardDetails.accesChantier === option.value &&
                        "mum-ia-optional-details__segment--active",
                    )}
                    onClick={() =>
                      onStandardDetailsChange({
                        accesChantier:
                          standardDetails.accesChantier === option.value
                            ? ""
                            : option.value,
                      })
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mum-ia-optional-details__field">
              <span className="mum-ia-optional-details__label">
                Protection particulière à prévoir
              </span>
              <Input
                value={standardDetails.protectionParticuliere}
                onChange={(event) =>
                  onStandardDetailsChange({
                    protectionParticuliere: event.target.value,
                  })
                }
                placeholder="Sols existants, parties communes, meubles à laisser…"
              />
            </label>

            <label className="mum-ia-optional-details__field">
              <span className="mum-ia-optional-details__label">
                Marque ou modèle souhaité (facultatif)
              </span>
              <Input
                value={standardDetails.marqueModele}
                onChange={(event) =>
                  onStandardDetailsChange({ marqueModele: event.target.value })
                }
                placeholder="Référence client si connue"
              />
            </label>

            <label className="mum-ia-optional-details__field">
              <span className="mum-ia-optional-details__label">
                Contraintes ou remarques client
              </span>
              <textarea
                value={standardDetails.contraintesRemarques}
                onChange={(event) =>
                  onStandardDetailsChange({
                    contraintesRemarques: event.target.value,
                  })
                }
                rows={3}
                placeholder="Contraintes d'accès, délais, finitions, exclusions…"
                className="mum-ia-optional-details__textarea"
              />
            </label>

            {groupedQuestions.length > 0 ? (
              <div className="mum-ia-optional-details__ia-questions">
                {groupedQuestions.map((group) => (
                  <div key={group.category} className="space-y-3">
                    <p className="mum-ia-optional-details__label">{group.category}</p>
                    <ul className="space-y-3">
                      {group.questions.map((question) => (
                        <li key={question.id}>
                          <label className="block space-y-1.5">
                            <span className="text-xs font-medium text-foreground/90">
                              {question.question}
                            </span>
                            <DynamicQuestionField
                              question={question}
                              value={questionAnswers[question.id] ?? ""}
                              onChange={(value) =>
                                onQuestionAnswerChange(question.id, value)
                              }
                            />
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}

            {analysis.hypothesesSuggerees.length > 0 ? (
              <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Hypothèses Batimum si vous ignorez les précisions
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {analysis.hypothesesSuggerees.map((hypothesis) => (
                    <li key={hypothesis}>{hypothesis}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mum-ia-optional-details__actions">
        <Button
          type="button"
          onClick={onGenerateWithDetails}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          Générer le devis
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onGenerateWithHypotheses}
          disabled={loading}
          className="w-full"
        >
          Ignorer les précisions et générer le devis
        </Button>
      </div>
    </div>
  );
}

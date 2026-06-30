"use client";

import { Fragment, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  buildDevisLigneSuggestions,
  type DevisLigneSuggestion,
} from "@/lib/devis-ligne-suggestions";
import { useStore } from "@/lib/store";
import {
  getLigneDesignation,
  getLigneDescriptionCourte,
  isSectionLigne,
} from "@/lib/devis-lignes";
import {
  formatSectionSubtotalLabel,
  getSectionSubtotalsAfterIndex,
} from "@/lib/devis-sections";
import {
  getLigneTvaSelectValue,
  ligneMontantHT,
  patchLigneTvaFromSelect,
  TAUX_TVA_LIGNE_OPTIONS,
} from "@/lib/devis-tva";
import type { LigneDevis } from "@/lib/types";
import type { ValidationErrors } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { GripVertical, Trash2 } from "lucide-react";
import {
  formatPrixUnitaireInputValue,
  getUniteDevisSelectValue,
  isUniteDevisPreset,
  parsePrixUnitaireInput,
  UNITE_DEVIS_AUTRE,
  UNITE_DEVIS_TEXTE_PERSONNALISE_LABEL,
  UNITES_DEVIS,
} from "@/lib/devis-unites";

const cellInputClass =
  "h-10 min-h-10 w-full rounded-lg border border-transparent bg-transparent px-2.5 text-xs shadow-none transition-all duration-200 hover:border-border/50 hover:bg-white/[0.03] focus:border-primary/55 focus:bg-white/[0.04] focus:ring-2 focus:ring-primary/15";

const cellTextareaClass =
  "min-h-10 w-full resize-none overflow-hidden rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-xs leading-relaxed shadow-none transition-all duration-200 hover:border-border/50 hover:bg-white/[0.03] focus:border-primary/55 focus:bg-white/[0.04] focus:ring-2 focus:ring-primary/15";

const dragHandleClass =
  "inline-flex cursor-grab items-center justify-center rounded-lg border border-transparent bg-white/[0.02] p-1.5 text-muted-foreground/55 transition-all duration-200 hover:border-border/50 hover:bg-white/[0.05] hover:text-muted-foreground active:cursor-grabbing";

const deleteBtnClass =
  "h-7 w-7 rounded-lg p-0 text-muted-foreground/45 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400/90";

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${Math.max(40, element.scrollHeight)}px`;
}

function LigneCellTextarea({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (ref.current) resizeTextarea(ref.current);
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      event.stopPropagation();
    }
  }

  return (
    <Textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      className={`${cellTextareaClass} ${className ?? ""}`}
      onKeyDown={handleKeyDown}
      onChange={(event) => {
        onChange(event.target.value);
        resizeTextarea(event.target);
      }}
    />
  );
}

export function DevisLignesEditor({
  lignes,
  defaultTva,
  errors,
  invalidClass,
  readOnly = false,
  onReorder,
  onUpdateLigne,
  onRemoveLigne,
}: {
  lignes: LigneDevis[];
  defaultTva: number;
  errors: ValidationErrors;
  invalidClass: string;
  readOnly?: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onUpdateLigne: (id: string, patch: Partial<LigneDevis>) => void;
  onRemoveLigne: (id: string) => void;
}) {
  const { data } = useStore();
  const [activeSuggestionLineId, setActiveSuggestionLineId] = useState<string | null>(null);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const sectionSubtotals = useMemo(
    () => getSectionSubtotalsAfterIndex(lignes, defaultTva),
    [lignes, defaultTva],
  );

  const suggestions = useMemo(
    () => buildDevisLigneSuggestions(data, suggestionQuery),
    [data, suggestionQuery],
  );

  function applySuggestion(ligneId: string, suggestion: DevisLigneSuggestion) {
    onUpdateLigne(ligneId, {
      designation: suggestion.designation,
      unite: suggestion.unite,
      prixUnitaire: suggestion.prixUnitaireHT,
      tauxTVA: suggestion.tauxTVA ?? defaultTva,
      descriptionCourte: "",
    });
    setActiveSuggestionLineId(null);
    setSuggestionQuery("");
  }

  function handleDrop(targetIndex: number) {
    if (readOnly) return;
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    onReorder(dragIndex, targetIndex);
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleDragStart(index: number) {
    if (readOnly) return;
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleRowDragOver(event: DragEvent, index: number) {
    if (dragIndex === null) return;
    event.preventDefault();
    setOverIndex(index);
  }

  return (
    <div className="h-full min-h-[min(72vh,680px)] w-full overflow-x-auto rounded-xl border border-border/50 bg-card/90 shadow-inner">
      <table className="w-full min-w-[960px] table-fixed border-collapse text-sm md:min-w-full">
        <colgroup>
          <col className="w-9" />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
          <col className="w-[8%]" />
          <col className="w-[10%]" />
          <col className="w-[11%]" />
          <col className="w-[10%]" />
          <col className="w-[11%]" />
          <col className="w-11" />
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border/50 bg-card-elevated/95 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
            <th className="w-9 border-r border-border/30 px-1.5 py-3" aria-label="Réordonner" />
            <th className="border-r border-border/30 px-3 py-3 font-semibold">
              Désignation
            </th>
            <th className="border-r border-border/30 px-3 py-3 font-semibold">
              Description courte
            </th>
            <th className="border-r border-border/30 px-3 py-3 font-semibold text-right">
              Quantité
            </th>
            <th className="border-r border-border/30 px-3 py-3 font-semibold">Unité</th>
            <th className="border-r border-border/30 px-3 py-3 font-semibold text-right">
              Prix unitaire HT
            </th>
            <th className="border-r border-border/30 px-3 py-3 font-semibold">TVA</th>
            <th className="border-r border-border/30 px-3 py-3 font-semibold text-right">
              Total HT
            </th>
            <th className="w-11 px-1.5 py-3" />
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, index) => {
            const isDragging = dragIndex === index;
            const isOver = overIndex === index && dragIndex !== index;
            const isSection = isSectionLigne(ligne);
            const ht = ligneMontantHT(ligne);
            const subtotal = sectionSubtotals.get(index);

            const row = isSection ? (
              <tr
                onDragOver={(event) => handleRowDragOver(event, index)}
                onDragLeave={() => {
                  if (overIndex === index) setOverIndex(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(index);
                }}
                className={`group border-b border-border/25 bg-primary/[0.07] align-middle transition-colors duration-200 hover:bg-primary/[0.1] ${
                  isDragging ? "opacity-50" : ""
                } ${isOver ? "bg-primary/12" : ""}`}
              >
                <td className="border-r border-border/20 px-1.5 py-1.5 text-center">
                  {!readOnly && (
                    <button
                      type="button"
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      className={dragHandleClass}
                      aria-label="Glisser pour réordonner"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
                <td colSpan={7} className="border-r border-border/20 px-1.5 py-2 align-top">
                  {readOnly ? (
                    <p className="px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      {getLigneDesignation(ligne)}
                    </p>
                  ) : (
                    <LigneCellTextarea
                      value={getLigneDesignation(ligne)}
                      className={`font-bold uppercase tracking-[0.12em] text-primary ${
                        errors[`lignes.${index}.description`] ? invalidClass : ""
                      }`}
                      onChange={(value) =>
                        onUpdateLigne(ligne.id, {
                          designation: value,
                        })
                      }
                      placeholder="Ex : PARTIE PLACO"
                    />
                  )}
                </td>
                <td className="px-1.5 py-1.5 text-right">
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={deleteBtnClass}
                      onClick={() => onRemoveLigne(ligne.id)}
                      aria-label="Supprimer la section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              <tr
                onDragOver={(event) => handleRowDragOver(event, index)}
                onDragLeave={() => {
                  if (overIndex === index) setOverIndex(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(index);
                }}
                className={`group border-b border-border/25 align-top transition-colors duration-200 hover:bg-primary/[0.03] ${
                  isDragging ? "opacity-50" : ""
                } ${isOver ? "bg-primary/[0.06]" : index % 2 === 0 ? "bg-card/90" : "bg-card-elevated/90"}`}
              >
                <td className="border-r border-border/20 px-1.5 py-1.5 align-middle text-center">
                  {!readOnly && (
                    <button
                      type="button"
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      className={dragHandleClass}
                      aria-label="Glisser pour réordonner"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
                <td className="border-r border-border/20 px-1.5 py-1.5 align-top">
                  {readOnly ? (
                    <p className="px-2.5 py-2 text-xs text-foreground">
                      {getLigneDesignation(ligne)}
                    </p>
                  ) : (
                    <div className="relative">
                      <LigneCellTextarea
                        value={getLigneDesignation(ligne)}
                        className={errors[`lignes.${index}.description`] ? invalidClass : ""}
                        onChange={(value) => {
                          setActiveSuggestionLineId(ligne.id);
                          setSuggestionQuery(value);
                          onUpdateLigne(ligne.id, { designation: value });
                        }}
                        placeholder="Ex : Pose carrelage"
                      />
                      {activeSuggestionLineId === ligne.id && suggestions.length > 0 ? (
                        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-xl border border-border/80 bg-card shadow-lg">
                          {suggestions.map((suggestion) => (
                            <li key={suggestion.id}>
                              <button
                                type="button"
                                className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-primary/10"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  applySuggestion(ligne.id, suggestion);
                                }}
                              >
                                <span>
                                  <span className="font-medium text-foreground">
                                    {suggestion.designation}
                                  </span>
                                  {suggestion.categorie ? (
                                    <span className="ml-2 text-muted-foreground">
                                      {suggestion.categorie}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="shrink-0 text-muted-foreground">
                                  {formatCurrency(suggestion.prixUnitaireHT)} / {suggestion.unite}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="border-r border-border/20 px-1.5 py-1.5 align-top">
                  {readOnly ? (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">
                      {getLigneDescriptionCourte(ligne) || "—"}
                    </p>
                  ) : (
                    <LigneCellTextarea
                      value={getLigneDescriptionCourte(ligne)}
                      onChange={(value) =>
                        onUpdateLigne(ligne.id, {
                          descriptionCourte: value,
                        })
                      }
                      placeholder="Détail optionnel"
                    />
                  )}
                </td>
                <td className="border-r border-border/20 px-1.5 py-1.5 align-middle">
                  {readOnly ? (
                    <p className="px-2.5 py-2 text-right text-xs tabular-nums">
                      {ligne.quantite}
                    </p>
                  ) : (
                    <Input
                      min={0}
                      step="0.01"
                      type="number"
                      value={ligne.quantite}
                      className={
                        errors[`lignes.${index}.quantite`]
                          ? `${cellInputClass} ${invalidClass} text-right tabular-nums`
                          : `${cellInputClass} text-right tabular-nums`
                      }
                      onChange={(event) =>
                        onUpdateLigne(ligne.id, {
                          quantite: Number(event.target.value) || 0,
                        })
                      }
                    />
                  )}
                </td>
                <td className="border-r border-border/20 px-1.5 py-1.5 align-middle">
                  {readOnly ? (
                    <p className="px-2.5 py-2 text-xs">{ligne.unite || "—"}</p>
                  ) : (
                    <>
                      <Select
                        value={getUniteDevisSelectValue(ligne.unite)}
                        className={
                          errors[`lignes.${index}.unite`]
                            ? `${cellInputClass} ${invalidClass}`
                            : cellInputClass
                        }
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === UNITE_DEVIS_AUTRE) {
                            onUpdateLigne(ligne.id, {
                              unite: isUniteDevisPreset(ligne.unite) ? "" : (ligne.unite ?? ""),
                            });
                            return;
                          }
                          onUpdateLigne(ligne.id, { unite: value });
                        }}
                      >
                        {UNITES_DEVIS.map((unite) => (
                          <option key={unite} value={unite}>
                            {unite}
                          </option>
                        ))}
                        <option value={UNITE_DEVIS_AUTRE}>
                          {UNITE_DEVIS_TEXTE_PERSONNALISE_LABEL}
                        </option>
                      </Select>
                      {!isUniteDevisPreset(ligne.unite) && (
                        <Input
                          className={
                            errors[`lignes.${index}.unite`]
                              ? `${cellInputClass} ${invalidClass} mt-1`
                              : `${cellInputClass} mt-1`
                          }
                          value={ligne.unite ?? ""}
                          placeholder="Ex : palette, sac…"
                          onChange={(event) =>
                            onUpdateLigne(ligne.id, { unite: event.target.value })
                          }
                        />
                      )}
                    </>
                  )}
                </td>
                <td className="border-r border-border/20 px-1.5 py-1.5 align-middle">
                  {readOnly ? (
                    <p className="px-2.5 py-2 text-right text-xs tabular-nums">
                      {formatPrixUnitaireInputValue(ligne.prixUnitaire)}
                    </p>
                  ) : (
                    <Input
                      min={0}
                      step="0.01"
                      type="number"
                      value={formatPrixUnitaireInputValue(ligne.prixUnitaire)}
                      className={
                        errors[`lignes.${index}.prixUnitaire`]
                          ? `${cellInputClass} ${invalidClass} text-right tabular-nums`
                          : `${cellInputClass} text-right tabular-nums`
                      }
                      onChange={(event) =>
                        onUpdateLigne(ligne.id, {
                          prixUnitaire: parsePrixUnitaireInput(event.target.value),
                        })
                      }
                    />
                  )}
                </td>
                <td className="border-r border-border/20 px-1.5 py-1.5 align-middle">
                  {readOnly ? (
                    <p className="px-2.5 py-2 text-xs">
                      {getLigneTvaSelectValue(ligne, defaultTva)} %
                    </p>
                  ) : (
                    <Select
                      value={getLigneTvaSelectValue(ligne, defaultTva)}
                      className={cellInputClass}
                      onChange={(event) =>
                        onUpdateLigne(
                          ligne.id,
                          patchLigneTvaFromSelect(event.target.value),
                        )
                      }
                    >
                      {TAUX_TVA_LIGNE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </td>
                <td className="border-r border-border/20 px-3 py-1.5 align-middle text-right text-xs font-semibold tabular-nums text-foreground/95">
                  {formatCurrency(ht)}
                </td>
                <td className="px-1.5 py-1.5 align-middle text-right">
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={deleteBtnClass}
                      onClick={() => onRemoveLigne(ligne.id)}
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            );

            return (
              <Fragment key={ligne.id}>
                {row}
                {subtotal && (
                  <tr className="border-b border-border/30 bg-primary/[0.04]">
                    <td className="border-r border-border/20" />
                    <td
                      colSpan={7}
                      className="border-r border-border/20 px-3 py-2 text-right text-xs text-muted-foreground"
                    >
                      <span className="font-medium text-foreground/90">
                        {formatSectionSubtotalLabel(
                          subtotal.sectionTitle,
                          subtotal.totalHT,
                          formatCurrency,
                        )}
                      </span>
                      {subtotal.totalTVA > 0 && (
                        <span className="ml-3 tabular-nums">
                          TVA {formatCurrency(subtotal.totalTVA)}
                        </span>
                      )}
                      {subtotal.totalTTC > subtotal.totalHT && (
                        <span className="ml-3 font-semibold tabular-nums text-foreground/90">
                          TTC {formatCurrency(subtotal.totalTTC)}
                        </span>
                      )}
                    </td>
                    <td />
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

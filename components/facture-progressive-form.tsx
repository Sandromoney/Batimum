"use client";

import { Label, Select, Input } from "@/components/ui/input";
import { canTransformDevisToFacture } from "@/lib/factures";
import {
  TYPE_FACTURE_LABELS,
  TYPES_FACTURE,
  applyProgressiveFactureFields,
  buildProgressiveBillingContext,
  normalizeTypeFacture,
  resolveTotalProjetTTC,
} from "@/lib/factures-progressive";
import type { AppData, Facture, TypeFacture } from "@/lib/types";
import type { ValidationErrors } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";

function getFormLinks(form: Facture) {
  return {
    devisId: form.devisLieId ?? form.devisSourceId,
    chantierId: form.chantierLieId ?? form.chantierId,
  };
}

export function FactureProgressiveForm({
  form,
  data,
  errors,
  invalidClass,
  onChange,
}: {
  form: Facture;
  data: AppData;
  errors: ValidationErrors;
  invalidClass?: string;
  onChange: (next: Facture) => void;
}) {
  const type = normalizeTypeFacture(form.typeFacture);
  const { devisId, chantierId } = getFormLinks(form);
  const devisLie = devisId
    ? data.devis.find((devis) => devis.id === devisId)
    : undefined;
  const chantierLie = chantierId
    ? data.chantiers.find((chantier) => chantier.id === chantierId)
    : undefined;
  const totalProjetTTC = resolveTotalProjetTTC(
    devisLie,
    chantierLie,
    data.parametres.tva,
  );
  const ctx =
    type !== "classique" && totalProjetTTC > 0
      ? buildProgressiveBillingContext(data.factures, {
          devisId,
          chantierId,
          totalProjetTTC,
          excludeFactureId: form.id,
        })
      : null;

  const devisClient = data.devis.filter(
    (devis) =>
      devis.clientId === form.clientId && canTransformDevisToFacture(devis),
  );
  const chantiersClient = data.chantiers.filter(
    (chantier) => chantier.clientId === form.clientId,
  );

  function patch(patch: Partial<Facture>) {
    const merged = { ...form, ...patch };
    const links = getFormLinks(merged);
    const devis = links.devisId
      ? data.devis.find((item) => item.id === links.devisId)
      : undefined;
    const chantier = links.chantierId
      ? data.chantiers.find((item) => item.id === links.chantierId)
      : undefined;
    const total = resolveTotalProjetTTC(devis, chantier, data.parametres.tva);
    const context =
      normalizeTypeFacture(merged.typeFacture) !== "classique" && total > 0
        ? buildProgressiveBillingContext(data.factures, {
            devisId: links.devisId,
            chantierId: links.chantierId,
            totalProjetTTC: total,
            excludeFactureId: merged.id,
          })
        : null;
    onChange(applyProgressiveFactureFields(merged, context, total));
  }

  const montantAuto =
    type === "acompte" || type === "situation" || type === "solde";

  return (
    <>
      <section>
        <Label>Type de facture</Label>
        <Select
          value={type}
          className="mt-1"
          onChange={(event) =>
            patch({
              typeFacture: event.target.value as TypeFacture,
              acompteMode: "pourcentage",
              acompteValeur: 30,
              pourcentageAvancement: 50,
              situationMode: "pourcentage",
              situationQuantitePourcentage: 50,
              situationMontantLibre: 0,
            })
          }
        >
          {TYPES_FACTURE.map((item) => (
            <option key={item} value={item}>
              {TYPE_FACTURE_LABELS[item]}
            </option>
          ))}
        </Select>
      </section>

      {type !== "classique" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <section>
            <Label>Devis lié</Label>
            <Select
              value={devisId ?? ""}
              className={errors.devisLieId ? invalidClass : undefined}
              onChange={(event) => {
                const nextDevisId = event.target.value || undefined;
                const devis = data.devis.find((item) => item.id === nextDevisId);
                patch({
                  devisLieId: nextDevisId,
                  devisSourceId: undefined,
                  chantierLieId: form.chantierLieId,
                  clientId: devis?.clientId ?? form.clientId,
                });
              }}
            >
              <option value="">— Sélectionner —</option>
              {devisClient.map((devis) => (
                <option key={devis.id} value={devis.id}>
                  {devis.numero} — {devis.titre}
                </option>
              ))}
            </Select>
            {errors.devisLieId && (
              <p className="mt-1 text-sm text-red-400">{errors.devisLieId}</p>
            )}
          </section>
          <section>
            <Label>Chantier lié</Label>
            <Select
              value={chantierId ?? ""}
              onChange={(event) =>
                patch({
                  chantierLieId: event.target.value || undefined,
                  chantierId: event.target.value || undefined,
                })
              }
            >
              <option value="">— Sélectionner —</option>
              {chantiersClient.map((chantier) => (
                <option key={chantier.id} value={chantier.id}>
                  {chantier.nom}
                </option>
              ))}
            </Select>
          </section>
        </section>
      )}

      {ctx && (
        <section className="rounded-2xl border border-border bg-card-elevated/60 p-4 text-sm">
          <p className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total devis / chantier (TTC)</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(ctx.totalDevisTTC)}
            </span>
          </p>
          <p className="mt-2 flex justify-between gap-4">
            <span className="text-muted-foreground">Déjà facturé (toutes factures)</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(ctx.montantDejaFacture)}
            </span>
          </p>
          <p className="mt-2 flex justify-between gap-4 border-t border-border pt-2">
            <span className="text-muted-foreground">Reste à facturer</span>
            <span className="font-semibold tabular-nums text-primary">
              {formatCurrency(ctx.resteAFacturer)}
            </span>
          </p>
        </section>
      )}

      {type === "acompte" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <section>
            <Label>Mode acompte</Label>
            <Select
              value={form.acompteMode ?? "pourcentage"}
              onChange={(event) =>
                patch({
                  acompteMode: event.target.value as "montant" | "pourcentage",
                })
              }
            >
              <option value="pourcentage">Pourcentage</option>
              <option value="montant">Montant fixe</option>
            </Select>
          </section>
          <section>
            <Label>
              {form.acompteMode === "montant" ? "Montant acompte (€)" : "Pourcentage (%)"}
            </Label>
            <Input
              type="number"
              min={0}
              step={form.acompteMode === "montant" ? "0.01" : "1"}
              max={form.acompteMode === "pourcentage" ? 100 : undefined}
              value={form.acompteValeur ?? ""}
              className={errors.acompteValeur ? invalidClass : undefined}
              onChange={(event) =>
                patch({
                  acompteValeur:
                    event.target.value === "" ? 0 : Number(event.target.value),
                })
              }
            />
            {errors.acompteValeur && (
              <p className="mt-1 text-sm text-red-400">{errors.acompteValeur}</p>
            )}
          </section>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Cet acompte sera déduit automatiquement sur la facture de solde finale.
          </p>
        </section>
      )}

      {type === "situation" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <section className="sm:col-span-2">
            <Label>Mode de situation</Label>
            <Select
              value={form.situationMode ?? "pourcentage"}
              onChange={(event) =>
                patch({
                  situationMode: event.target.value as
                    | "pourcentage"
                    | "quantite"
                    | "montant",
                })
              }
            >
              <option value="pourcentage">Par pourcentage</option>
              <option value="quantite">Par quantité</option>
              <option value="montant">Montant libre</option>
            </Select>
          </section>
          {(form.situationMode ?? "pourcentage") === "pourcentage" && (
            <section>
              <Label>Pourcentage d&apos;avancement facturé (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="1"
                value={form.pourcentageAvancement ?? ""}
                className={errors.pourcentageAvancement ? invalidClass : undefined}
                onChange={(event) =>
                  patch({
                    pourcentageAvancement:
                      event.target.value === "" ? 0 : Number(event.target.value),
                  })
                }
              />
              {errors.pourcentageAvancement && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.pourcentageAvancement}
                </p>
              )}
            </section>
          )}
          {form.situationMode === "quantite" && (
            <section>
              <Label>Pourcentage des quantités facturées (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="1"
                value={form.situationQuantitePourcentage ?? ""}
                className={
                  errors.situationQuantitePourcentage ? invalidClass : undefined
                }
                onChange={(event) =>
                  patch({
                    situationQuantitePourcentage:
                      event.target.value === "" ? 0 : Number(event.target.value),
                  })
                }
              />
              {errors.situationQuantitePourcentage && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.situationQuantitePourcentage}
                </p>
              )}
            </section>
          )}
          {form.situationMode === "montant" && (
            <section>
              <Label>Montant de la situation (TTC)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.situationMontantLibre ?? ""}
                className={errors.situationMontantLibre ? invalidClass : undefined}
                onChange={(event) =>
                  patch({
                    situationMontantLibre:
                      event.target.value === "" ? 0 : Number(event.target.value),
                  })
                }
              />
              {errors.situationMontantLibre && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.situationMontantLibre}
                </p>
              )}
            </section>
          )}
          <section>
            <Label>Total de cette situation (TTC)</Label>
            <Input readOnly value={formatCurrency(form.totalSituation ?? form.montant)} />
          </section>
        </section>
      )}

      {type === "solde" && ctx && (
        <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
          <h3 className="mb-3 font-semibold text-foreground">Facture de solde</h3>
          <p className="flex justify-between gap-4">
            <span className="text-muted-foreground">Total devis</span>
            <span className="tabular-nums">{formatCurrency(ctx.totalDevisTTC)}</span>
          </p>
          {ctx.deductions.length > 0 ? (
            <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
              {ctx.deductions.map((deduction) => (
                <li
                  key={deduction.factureId}
                  className="flex justify-between gap-4 text-muted-foreground"
                >
                  <span>
                    {TYPE_FACTURE_LABELS[deduction.typeFacture]} {deduction.numero}
                  </span>
                  <span className="tabular-nums text-foreground">
                    − {formatCurrency(deduction.montant)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted-foreground">Aucun acompte ni situation à déduire.</p>
          )}
          <p className="mt-3 flex justify-between gap-4 border-t border-border pt-3 font-semibold text-foreground">
            <span>Reste à payer</span>
            <span className="tabular-nums text-primary">
              {formatCurrency(form.resteAPayer ?? form.montant)}
            </span>
          </p>
        </section>
      )}

      {montantAuto && (
        <p className="text-xs text-muted-foreground">
          Montant TTC calculé automatiquement à partir du devis/chantier lié.
        </p>
      )}
    </>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImportPreviewRow } from "@/lib/entreprise-price-library/import";
import { formatCurrency } from "@/lib/utils";

type Props = {
  open: boolean;
  rows: ImportPreviewRow[];
  creditNotice?: string;
  onClose: () => void;
  onConfirm: (rows: ImportPreviewRow[]) => void;
  onChangeRows: (rows: ImportPreviewRow[]) => void;
};

function priceDiffLabel(row: ImportPreviewRow): string | null {
  if (
    row.existingPurchasePriceHT == null ||
    row.purchasePriceHT == null ||
    row.action !== "update"
  ) {
    return null;
  }
  const delta = row.purchasePriceHT - row.existingPurchasePriceHT;
  if (Math.abs(delta) < 0.001) return null;
  const pct =
    row.existingPurchasePriceHT !== 0
      ? (delta / row.existingPurchasePriceHT) * 100
      : 0;
  const sign = delta > 0 ? "+" : "";
  return `Ancien ${formatCurrency(row.existingPurchasePriceHT)} → Nouveau ${formatCurrency(row.purchasePriceHT)} (${sign}${formatCurrency(delta)} / ${sign}${pct.toFixed(1)} %)`;
}

export function TarifImportPreviewDialog({
  open,
  rows,
  creditNotice,
  onClose,
  onConfirm,
  onChangeRows,
}: Props) {
  if (!open) return null;

  const selectedCount = rows.filter((row) => row.selected && row.action !== "ignore")
    .length;

  function patchRow(rowId: string, patch: Partial<ImportPreviewRow>) {
    onChangeRows(
      rows.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, ...patch };
        if (
          patch.purchasePriceHT != null ||
          patch.tva != null ||
          ("purchasePriceHT" in patch && patch.purchasePriceHT === undefined)
        ) {
          const ht = next.purchasePriceHT;
          const tva = next.tva ?? 20;
          next.purchasePriceTTC =
            ht != null ? Number((ht * (1 + tva / 100)).toFixed(2)) : undefined;
        }
        return next;
      }),
    );
  }

  function selectAll(selected: boolean) {
    onChangeRows(rows.map((row) => ({ ...row, selected })));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-xl">
        <div className="border-b border-border/80 p-4">
          <h3 className="text-base font-semibold">Prévisualisation import tarif</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Vérifiez et corrigez les lignes avant import. Les prix déjà vérifiés ne
            seront jamais écrasés automatiquement.
          </p>
          {creditNotice ? (
            <p className="mt-2 text-xs font-medium text-emerald-800">{creditNotice}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => selectAll(true)}>
              Tout sélectionner
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => selectAll(false)}
            >
              Tout désélectionner
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-2 py-2">Sel.</th>
                <th className="px-2 py-2">Référence</th>
                <th className="px-2 py-2">Désignation</th>
                <th className="px-2 py-2">Catégorie</th>
                <th className="px-2 py-2">Unité</th>
                <th className="px-2 py-2">Prix HT</th>
                <th className="px-2 py-2">Prix TTC</th>
                <th className="px-2 py-2">TVA</th>
                <th className="px-2 py-2">Confiance</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const diff = priceDiffLabel(row);
                return (
                  <tr key={row.id} className="border-t border-border/50 odd:bg-white even:bg-neutral-50/30">
                    <td className="px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) =>
                          patchRow(row.id, { selected: e.target.checked })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        className="h-8 min-w-[90px] text-xs"
                        value={row.reference ?? ""}
                        onChange={(e) =>
                          patchRow(row.id, { reference: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        className="h-8 min-w-[160px] text-xs"
                        value={row.detectedName}
                        onChange={(e) =>
                          patchRow(row.id, { detectedName: e.target.value })
                        }
                      />
                      {diff ? (
                        <p className="mt-1 text-[10px] text-amber-800">{diff}</p>
                      ) : null}
                      {row.aVerifier || row.action === "verify" ? (
                        <p className="mt-1 text-[10px] font-medium text-amber-700">
                          À vérifier
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        className="h-8 min-w-[90px] text-xs"
                        value={row.category ?? ""}
                        onChange={(e) =>
                          patchRow(row.id, { category: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        className="h-8 w-16 text-xs"
                        value={row.unit ?? "u"}
                        onChange={(e) => patchRow(row.id, { unit: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 w-24 text-xs"
                        value={row.purchasePriceHT ?? ""}
                        onChange={(e) =>
                          patchRow(row.id, {
                            purchasePriceHT: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top text-xs tabular-nums text-muted-foreground">
                      {row.purchasePriceTTC != null
                        ? formatCurrency(row.purchasePriceTTC)
                        : "—"}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8 w-16 text-xs"
                        value={row.tva ?? 20}
                        onChange={(e) =>
                          patchRow(row.id, { tva: Number(e.target.value) || 20 })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 align-top text-xs">{row.confidence} %</td>
                    <td className="px-2 py-2 align-top">
                      <select
                        className="rounded-lg border border-border/80 bg-white px-2 py-1 text-xs"
                        value={row.action}
                        onChange={(e) =>
                          patchRow(row.id, {
                            action: e.target.value as ImportPreviewRow["action"],
                            aVerifier:
                              e.target.value === "verify" ? true : row.aVerifier,
                          })
                        }
                      >
                        <option value="create">Importer / Créer</option>
                        <option value="update">Mettre à jour</option>
                        <option value="verify">Marquer à vérifier</option>
                        <option value="ignore">Ignorer</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 p-4">
          <p className="text-xs text-muted-foreground">
            {selectedCount} ligne(s) sélectionnée(s) pour import
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => onConfirm(rows)}
            >
              Importer les lignes sélectionnées
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

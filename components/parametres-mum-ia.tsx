"use client";

import { PageHeader } from "@/components/page-header";
import { ParametresSection } from "@/components/parametres-section";
import { ParametresToggle } from "@/components/parametres-toggle";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input, Label, Select } from "@/components/ui/input";
import {
  exportBibliothequeEntrepriseJson,
  importBibliothequeEntrepriseJson,
  normalizeBibliothequeEntreprise,
  resetBibliothequeEntreprise,
} from "@/lib/bibliotheque-entreprise";
import {
  getRegionalCoefficient,
  REGIONAL_COEFFICIENT_LEGEND,
} from "@/lib/batimum-coefficients-regionaux";
import { FRANCE_REGIONS } from "@/lib/france-regions";
import { useStore } from "@/lib/store";
import { ArrowLeft, Download, Library, Upload } from "lucide-react";
import { MumIaDiagnosticSection } from "@/components/mum-ia-diagnostic-section";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

export function ParametresMumIaPage() {
  const { data, setData } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const bibliotheque = useMemo(
    () => normalizeBibliothequeEntreprise(data.bibliothequeEntreprise),
    [data.bibliothequeEntreprise],
  );

  const allDepartements = useMemo(
    () =>
      FRANCE_REGIONS.flatMap((region) =>
        region.departements.map((dept) => ({
          code: dept.code,
          label: `${dept.code} — ${dept.label}`,
          regionCode: region.code,
          regionLabel: region.label,
        })),
      ),
    [],
  );

  const selectedDept = allDepartements.find(
    (dept) => dept.code === bibliotheque.departementPrincipal,
  );

  const coefAuto = useMemo(() => {
    if (!selectedDept) return null;
    return getRegionalCoefficient({
      regionCode: selectedDept.regionCode,
      departementCode: selectedDept.code,
    });
  }, [selectedDept]);

  function patchBibliotheque(
    patch: Partial<ReturnType<typeof normalizeBibliothequeEntreprise>>,
  ) {
    setData((prev) => ({
      ...prev,
      bibliothequeEntreprise: normalizeBibliothequeEntreprise({
        ...normalizeBibliothequeEntreprise(prev.bibliothequeEntreprise),
        ...patch,
      }),
    }));
  }

  function handleExport() {
    const json = exportBibliothequeEntrepriseJson(bibliotheque);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `batimum-bibliotheque-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = String(reader.result ?? "");
        setData((prev) => ({
          ...prev,
          bibliothequeEntreprise: importBibliothequeEntrepriseJson(
            normalizeBibliothequeEntreprise(prev.bibliothequeEntreprise),
            json,
          ),
        }));
      } catch {
        setImportError("Fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="btp-app-page mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="MUM IA"
        description="Paramètres de la bibliothèque de prix et de l'apprentissage automatique."
        action={
          <Link
            href="/parametres"
            className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Paramètres
          </Link>
        }
      />

      <ParametresSection
        title="Bibliothèque entreprise"
        description="Consultez et modifiez les prix appris et manuels."
      >
        <Link
          href="/parametres/bibliotheque"
          className="flex items-center justify-between rounded-2xl border border-border/80 bg-card/60 px-4 py-4 transition-colors hover:border-primary/25 hover:bg-card-hover"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Library className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">
                Ouvrir la bibliothèque entreprise
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {bibliotheque.entries.filter((e) => !e.desactive).length} ligne(s) active(s)
              </span>
            </span>
          </span>
          <span className="text-sm text-primary">Ouvrir →</span>
        </Link>
      </ParametresSection>

      <ParametresSection
        title="Apprentissage automatique"
        description="MUM IA enrichit discrètement la bibliothèque entreprise à partir de vos vrais devis."
      >
        <ParametresToggle
          label="Activer l'apprentissage automatique des prix"
          description="Analyse silencieuse lors de l'envoi ou de la signature"
          checked={bibliotheque.apprentissageAutomatique}
          onChange={(apprentissageAutomatique) =>
            patchBibliotheque({ apprentissageAutomatique })
          }
        />
        <ParametresToggle
          label="Apprendre depuis les devis envoyés"
          checked={bibliotheque.apprendreDepuisEnvoye !== false}
          onChange={(apprendreDepuisEnvoye) =>
            patchBibliotheque({ apprendreDepuisEnvoye })
          }
        />
        <ParametresToggle
          label="Apprendre depuis les devis signés"
          checked={bibliotheque.apprendreDepuisSigne !== false}
          onChange={(apprendreDepuisSigne) =>
            patchBibliotheque({ apprendreDepuisSigne })
          }
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Jamais depuis : brouillons, devis IA non transformés, devis refusés,
          supprimés ou tests IA. Les devis signés enrichissent aussi la bibliothèque
          des ratios métier ({bibliotheque.ratios?.filter((r) => r.source === "appris").length ?? 0}{" "}
          ratio(s) appris).
        </p>
      </ParametresSection>

      <ParametresSection
        title="Zone géographique"
        description="Département principal et coefficient régional pour les prix Batimum."
      >
        <section>
          <Label>Département principal de l&apos;entreprise</Label>
          <Select
            value={bibliotheque.departementPrincipal ?? ""}
            onChange={(event) => {
              const code = event.target.value;
              const dept = allDepartements.find((item) => item.code === code);
              patchBibliotheque({
                departementPrincipal: code || undefined,
                regionPrincipale: dept?.regionLabel,
              });
            }}
          >
            <option value="">— Sélectionner —</option>
            {allDepartements.map((dept) => (
              <option key={dept.code} value={dept.code}>
                {dept.label}
              </option>
            ))}
          </Select>
        </section>

        <section>
          <Label>Coefficient régional manuel (optionnel)</Label>
          <Input
            type="number"
            min={0.5}
            max={2}
            step="0.01"
            placeholder={
              coefAuto != null ? `Auto : ×${coefAuto}` : "Laisser vide pour automatique"
            }
            value={
              bibliotheque.coefficientRegionalManuel != null
                ? String(bibliotheque.coefficientRegionalManuel)
                : ""
            }
            onChange={(event) => {
              const raw = event.target.value.trim();
              if (!raw) {
                patchBibliotheque({ coefficientRegionalManuel: undefined });
                return;
              }
              const value = Number(raw);
              if (!Number.isNaN(value) && value > 0) {
                patchBibliotheque({ coefficientRegionalManuel: value });
              }
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line">
            {REGIONAL_COEFFICIENT_LEGEND}
          </p>
        </section>
      </ParametresSection>

      <MumIaDiagnosticSection />

      <ParametresSection
        title="Import / export"
        description="Sauvegardez ou restaurez votre bibliothèque entreprise."
      >
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Importer
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleImportFile(file);
              event.target.value = "";
            }}
          />
        </div>
        {importError ? (
          <p className="text-sm text-destructive">{importError}</p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setResetOpen(true)}
        >
          Réinitialiser la bibliothèque entreprise
        </Button>
      </ParametresSection>

      <ConfirmDialog
        open={resetOpen}
        title="Réinitialiser la bibliothèque ?"
        message="Toutes les lignes apprises et manuelles seront supprimées. Cette action est irréversible."
        confirmLabel="Réinitialiser"
        variant="danger"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          setData((prev) => ({
            ...prev,
            bibliothequeEntreprise: resetBibliothequeEntreprise(),
          }));
          setResetOpen(false);
        }}
      />
    </div>
  );
}

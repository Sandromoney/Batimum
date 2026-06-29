"use client";

import { ParametresThemePicker } from "@/components/parametres-theme-picker";
import { ParametresEmployesSection } from "@/components/parametres-employes-section";
import { PageHeader } from "@/components/page-header";
import { ParametresLogoField } from "@/components/parametres-logo-field";
import { ParametresSection } from "@/components/parametres-section";
import { ParametresToggle } from "@/components/parametres-toggle";
import { Button } from "@/components/ui/button";
import { Input, Label, PhoneInput, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useStore } from "@/lib/store";
import {
  formatNumeroExample,
  deriveSirenFromSiret,
  normalizeParametres,
  syncParametresForSave,
} from "@/lib/parametres";
import { ParametresDevisColorPicker } from "@/components/parametres-devis-color-picker";
import { ParametresFacturationElectroniqueSection } from "@/components/parametres-facturation-electronique";
import { ParametresConnexionEmailSection } from "@/components/parametres-connexion-email";
import {
  fetchUserSettings,
  saveUserSettings,
} from "@/lib/user-settings-client";
import {
  hasValidationErrors,
  validateParametresSave,
  type ValidationErrors,
} from "@/lib/validations";
import type { ModeTVA, Parametres } from "@/lib/types";
import { cn } from "@/lib/utils";
import { applyTheme, normalizeThemePreference } from "@/lib/theme";
import { Check, Library, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export default function ParametresPage() {
  const searchParams = useSearchParams();
  const { data, setData, reset } = useStore();
  const [form, setForm] = useState<Parametres>(() =>
    normalizeParametres(data.parametres),
  );
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [saveErrors, setSaveErrors] = useState<ValidationErrors>({});
  const invalidClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoadingSettings(true);
      const remote = await fetchUserSettings();

      if (cancelled) return;

      if (remote.parametres) {
        const synced = normalizeParametres(remote.parametres);
        setForm(synced);
        setData((prev) => ({
          ...prev,
          parametres: synced,
          employes:
            remote.employes && remote.employes.length > 0
              ? remote.employes
              : prev.employes,
        }));
        applyTheme(synced.theme);
      }

      setLoadingSettings(false);
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [setData]);

  useEffect(() => {
    if (searchParams.get("section") !== "connexion-email") return;
    const target = document.getElementById("connexion-email");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams]);

  function patch(partial: Partial<Parametres>) {
    setForm((previous) => ({ ...previous, ...partial }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateParametresSave(form);
    if (hasValidationErrors(errors)) {
      setSaveErrors(errors);
      return;
    }
    setSaveErrors({});
    setSaveMessage(null);
    setSaveError(false);
    setSaving(true);

    const synced = syncParametresForSave(form);
    const result = await saveUserSettings({
      parametres: synced,
      employes: data.employes,
    });

    setSaving(false);

    if (!result.ok) {
      setSaveError(true);
      setSaveMessage(result.error ?? "Impossible d'enregistrer les paramètres");
      setSaved(false);
      return;
    }

    setData((prev) => ({ ...prev, parametres: synced }));
    setForm(synced);
    applyTheme(synced.theme);
    setSaved(true);
    setSaveError(false);
    setSaveMessage("Paramètres enregistrés");
    setTimeout(() => {
      setSaved(false);
      setSaveMessage(null);
    }, 3000);
  }

  const exempleDevis = formatNumeroExample(
    form.prefixeDevis ?? "DEV",
    form.anneeAutomatique !== false,
    form.compteurDevis ?? 1,
  );
  const exempleFacture = formatNumeroExample(
    form.prefixeFacture ?? "FAC",
    form.anneeAutomatique !== false,
    form.compteurFacture ?? 1,
  );

  return (
    <div className="btp-app-page mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Paramètres"
        description="Configuration de votre espace Batimum — entreprise, documents et préférences"
        action={
          saved ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-opacity duration-300">
              <Check className="h-3.5 w-3.5" />
              Paramètres enregistrés
            </span>
          ) : loadingSettings ? (
            <span className="text-xs text-muted-foreground">Chargement…</span>
          ) : undefined
        }
      />

      <form className="space-y-6" onSubmit={save}>
        {saveMessage ? (
          <p
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              saveError
                ? "btp-alert-error"
                : "border-primary/30 bg-primary/10 text-primary",
            )}
          >
            {saveMessage}
          </p>
        ) : null}

        <fieldset
          disabled={loadingSettings || saving}
          className={cn(
            "space-y-6",
            (loadingSettings || saving) && "pointer-events-none opacity-60",
          )}
        >
        <ParametresSection
          title="Compte utilisateur"
          description="Profil affiché dans la barre latérale"
        >
          <section>
            <Label>Nom affiché</Label>
            <Input
              value={form.utilisateur}
              onChange={(e) => patch({ utilisateur: e.target.value })}
              placeholder="Jean Dupont"
              className={saveErrors.utilisateur ? invalidClass : undefined}
            />
            {saveErrors.utilisateur ? (
              <p className="mt-1 text-xs text-red-400">{saveErrors.utilisateur}</p>
            ) : null}
          </section>
        </ParametresSection>

        <ParametresConnexionEmailSection />

        <ParametresSection
          title="Entreprise"
          description="Identité légale et coordonnées affichées dans l'application et les PDF"
        >
          <FieldGrid>
            <section className="sm:col-span-2">
              <Label>Nom de l&apos;entreprise</Label>
              <Input
                value={form.entreprise}
                onChange={(e) => patch({ entreprise: e.target.value })}
                placeholder="Ex. : BTP Pro Services"
                className={saveErrors.entreprise ? invalidClass : undefined}
              />
              {saveErrors.entreprise ? (
                <p className="mt-1 text-xs text-red-400">{saveErrors.entreprise}</p>
              ) : null}
            </section>
          </FieldGrid>

          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Coordonnées entreprise
            </h3>
            <FieldGrid>
              <section>
                <Label>Site internet</Label>
                <Input
                  value={form.siteInternet ?? ""}
                  onChange={(e) => patch({ siteInternet: e.target.value })}
                  placeholder="https://www.votre-entreprise.fr"
                />
              </section>
              <section>
                <Label>SIRET</Label>
                <Input
                  value={form.siret}
                  onChange={(e) => {
                    const siret = e.target.value;
                    patch({ siret, siren: deriveSirenFromSiret(siret) });
                  }}
                  placeholder="123 456 789 00012"
                />
              </section>
              <section>
                <Label>SIREN</Label>
                <Input
                  value={form.siren ?? ""}
                  onChange={(e) => patch({ siren: e.target.value })}
                  placeholder="123 456 789"
                />
              </section>
              <section>
                <Label>Forme juridique</Label>
                <Input
                  value={form.formeJuridique ?? ""}
                  onChange={(e) => patch({ formeJuridique: e.target.value })}
                  placeholder="Ex. : SARL, SAS, EI"
                />
              </section>
              <section>
                <Label>Code APE</Label>
                <Input
                  value={form.codeApe ?? ""}
                  onChange={(e) => patch({ codeApe: e.target.value })}
                  placeholder="Ex. : 4399C"
                />
              </section>
              <section>
                <Label>TVA intracommunautaire</Label>
                <Input
                  value={form.tvaIntracom ?? ""}
                  onChange={(e) => patch({ tvaIntracom: e.target.value })}
                  placeholder="FR12345678901"
                />
              </section>
              <section className="sm:col-span-2">
                <Label>Capital social</Label>
                <Input
                  value={form.capitalSocial ?? ""}
                  onChange={(e) => patch({ capitalSocial: e.target.value })}
                  placeholder="Ex. : 10 000 €"
                />
              </section>
            </FieldGrid>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Adresse complète
            </h3>
            <FieldGrid>
              <section className="sm:col-span-2">
                <Label>Adresse</Label>
                <Input
                  value={form.adresse}
                  onChange={(e) => patch({ adresse: e.target.value })}
                  placeholder="12 rue des Artisans"
                  className={saveErrors.adresse ? invalidClass : undefined}
                />
                {saveErrors.adresse ? (
                  <p className="mt-1 text-xs text-red-400">{saveErrors.adresse}</p>
                ) : null}
              </section>
              <section>
                <Label>Code postal</Label>
                <Input
                  value={form.codePostal ?? ""}
                  onChange={(e) => patch({ codePostal: e.target.value })}
                  placeholder="75011"
                  className={saveErrors.codePostal ? invalidClass : undefined}
                />
                {saveErrors.codePostal ? (
                  <p className="mt-1 text-xs text-red-400">{saveErrors.codePostal}</p>
                ) : null}
              </section>
              <section>
                <Label>Ville</Label>
                <Input
                  value={form.ville ?? ""}
                  onChange={(e) => patch({ ville: e.target.value })}
                  placeholder="Paris"
                  className={saveErrors.ville ? invalidClass : undefined}
                />
                {saveErrors.ville ? (
                  <p className="mt-1 text-xs text-red-400">{saveErrors.ville}</p>
                ) : null}
              </section>
              <section>
                <Label>Pays</Label>
                <Input
                  value={form.pays ?? ""}
                  onChange={(e) => patch({ pays: e.target.value })}
                  placeholder="France"
                />
              </section>
            </FieldGrid>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Contact</h3>
            <FieldGrid>
              <section>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder="contact@entreprise.fr"
                  className={saveErrors.email ? invalidClass : undefined}
                />
                {saveErrors.email ? (
                  <p className="mt-1 text-xs text-red-400">{saveErrors.email}</p>
                ) : null}
              </section>
              <section>
                <Label>Email de facturation</Label>
                <Input
                  type="email"
                  value={form.emailFacturation ?? ""}
                  onChange={(e) => patch({ emailFacturation: e.target.value })}
                  placeholder="facturation@entreprise.fr"
                />
              </section>
              <section>
                <Label>Téléphone</Label>
                <PhoneInput
                  mode="auto"
                  value={form.telephone}
                  onChangeValue={(telephone) => patch({ telephone })}
                  placeholder="06 12 34 56 78"
                />
              </section>
            </FieldGrid>
          </div>

          <ParametresToggle
            label="Assurance décennale"
            description="Afficher les informations d'assurance sur vos documents"
            checked={Boolean(form.assuranceDecennale)}
            onChange={(assuranceDecennale) => patch({ assuranceDecennale })}
          />
          {form.assuranceDecennale ? (
            <FieldGrid>
              <section>
                <Label>Nom de l&apos;assurance</Label>
                <Input
                  value={form.nomAssurance ?? ""}
                  onChange={(e) => patch({ nomAssurance: e.target.value })}
                  placeholder="Ex. : MMA Entreprises"
                />
              </section>
              <section>
                <Label>Numéro de police</Label>
                <Input
                  value={form.numeroPoliceAssurance ?? ""}
                  onChange={(e) =>
                    patch({ numeroPoliceAssurance: e.target.value })
                  }
                  placeholder="Référence contrat décennale"
                />
              </section>
            </FieldGrid>
          ) : null}
        </ParametresSection>

        <ParametresEmployesSection />

        <ParametresSection
          title="Documents & PDF"
          description="Logos et éléments visuels de vos documents commerciaux"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <ParametresLogoField
              label="Logo application"
              hint="Affiché dans la barre latérale et l'interface Batimum."
              value={form.logoApplication}
              onChange={(logoApplication) => patch({ logoApplication })}
            />
            <ParametresLogoField
              label="Logo PDF"
              hint="Utilisé sur les devis et factures exportés en PDF."
              value={form.logoPdf}
              onChange={(logoPdf) => patch({ logoPdf })}
            />
          </div>
          <ParametresDevisColorPicker
            value={form.couleurDevis ?? "bleu_batimum"}
            onChange={(couleurDevis) => patch({ couleurDevis })}
          />
        </ParametresSection>

        <ParametresSection
          title="Numérotation"
          description="Préfixes et compteurs pour les prochains devis et factures"
        >
          <ParametresToggle
            label="Année automatique"
            description="Inclure l'année courante dans les numéros (ex. DEV-2026-001)"
            checked={form.anneeAutomatique !== false}
            onChange={(anneeAutomatique) => patch({ anneeAutomatique })}
          />
          <FieldGrid>
            <section>
              <Label>Préfixe devis</Label>
              <Input
                value={form.prefixeDevis ?? "DEV"}
                onChange={(e) =>
                  patch({ prefixeDevis: e.target.value.toUpperCase() })
                }
                placeholder="DEV"
              />
              <p className="mt-2 font-mono text-xs text-primary">
                Exemple : {exempleDevis}
              </p>
            </section>
            <section>
              <Label>Compteur devis</Label>
              <Input
                type="number"
                min={1}
                value={form.compteurDevis ?? 1}
                onChange={(e) =>
                  patch({ compteurDevis: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </section>
            <section>
              <Label>Préfixe facture</Label>
              <Input
                value={form.prefixeFacture ?? "FAC"}
                onChange={(e) =>
                  patch({ prefixeFacture: e.target.value.toUpperCase() })
                }
                placeholder="FAC"
              />
              <p className="mt-2 font-mono text-xs text-primary">
                Exemple : {exempleFacture}
              </p>
            </section>
            <section>
              <Label>Compteur facture</Label>
              <Input
                type="number"
                min={1}
                value={form.compteurFacture ?? 1}
                onChange={(e) =>
                  patch({
                    compteurFacture: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </section>
          </FieldGrid>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Les numéros existants sont conservés. Les nouveaux documents utilisent
            le plus grand compteur entre votre réglage et la suite logique déjà
            présente.
          </p>
        </ParametresSection>

        <ParametresSection
          title="Facturation"
          description="TVA, conditions de paiement et mentions légales des PDF"
        >
          <section>
            <Label>Mode TVA</Label>
            <Select
              value={form.modeTVA ?? "classique"}
              onChange={(e) =>
                patch({ modeTVA: e.target.value as ModeTVA })
              }
            >
              <option value="classique">TVA classique</option>
              <option value="non_applicable_293B">
                TVA non applicable — art. 293 B du CGI
              </option>
            </Select>
          </section>
          {form.modeTVA !== "non_applicable_293B" ? (
            <FieldGrid>
              <section>
                <Label>TVA (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.tva}
                  onChange={(e) => patch({ tva: Number(e.target.value) })}
                />
              </section>
            </FieldGrid>
          ) : (
            <p className="rounded-xl border border-border/80 bg-card-elevated/50 px-4 py-3 text-sm text-muted-foreground">
              Les PDF afficheront automatiquement la mention « TVA non applicable,
              article 293 B du CGI ».
            </p>
          )}
          <section>
            <Label>Conditions de règlement</Label>
            <Input
              value={form.conditionsReglement ?? ""}
              onChange={(e) => patch({ conditionsReglement: e.target.value })}
              placeholder="Paiement à 30 jours par virement bancaire"
            />
          </section>
          <section>
            <Label>Acompte</Label>
            <Input
              value={form.acompte ?? ""}
              onChange={(e) => patch({ acompte: e.target.value })}
              placeholder="30 % à la commande, solde à réception"
            />
          </section>
          <section>
            <Label>Pénalités de retard</Label>
            <Textarea
              value={form.penalitesRetard ?? ""}
              onChange={(e) => patch({ penalitesRetard: e.target.value })}
              placeholder="Taux légal en vigueur appliqué en cas de retard de paiement"
              rows={3}
            />
          </section>
          <section>
            <Label>Indemnité forfaitaire de recouvrement</Label>
            <Textarea
              value={form.indemniteForfaitaire ?? ""}
              onChange={(e) => patch({ indemniteForfaitaire: e.target.value })}
              placeholder="40 € pour frais de recouvrement (art. L441-10 C. com.)"
              rows={2}
            />
          </section>
          <section>
            <Label>Tribunal compétent</Label>
            <Input
              value={form.tribunalCompetent ?? ""}
              onChange={(e) => patch({ tribunalCompetent: e.target.value })}
              placeholder="Tribunal de commerce de…"
            />
          </section>
        </ParametresSection>

        <ParametresSection
          title="Coordonnées bancaires"
          description="RIB affiché sur devis et factures si l'option est activée"
        >
          <FieldGrid>
            <section>
              <Label>Titulaire du compte</Label>
              <Input
                value={form.coordonneesBancairesTitulaire ?? ""}
                onChange={(e) =>
                  patch({ coordonneesBancairesTitulaire: e.target.value })
                }
                placeholder="Nom du titulaire"
              />
            </section>
            <section>
              <Label>Banque</Label>
              <Input
                value={form.coordonneesBancairesBanque ?? ""}
                onChange={(e) =>
                  patch({ coordonneesBancairesBanque: e.target.value })
                }
                placeholder="Nom de la banque"
              />
            </section>
            <section>
              <Label>IBAN</Label>
              <Input
                value={form.coordonneesBancairesIban ?? ""}
                onChange={(e) =>
                  patch({ coordonneesBancairesIban: e.target.value })
                }
                placeholder="FR76 1234 5678 9012 3456 7890 123"
              />
            </section>
            <section>
              <Label>BIC / SWIFT</Label>
              <Input
                value={form.coordonneesBancairesBic ?? ""}
                onChange={(e) =>
                  patch({ coordonneesBancairesBic: e.target.value })
                }
                placeholder="ABCDEFGH"
              />
            </section>
          </FieldGrid>
          <ParametresToggle
            label="Afficher les coordonnées bancaires sur les documents"
            description="Devis et factures PDF, emails envoyés au client"
            checked={Boolean(form.afficherCoordonneesBancaires)}
            onChange={(afficherCoordonneesBancaires) =>
              patch({ afficherCoordonneesBancaires })
            }
          />
        </ParametresSection>

        <ParametresFacturationElectroniqueSection
          form={form}
          onChange={setForm}
        />

        <ParametresSection
          title="Conditions générales"
          description="Texte libre affiché en bas des PDF devis et factures si renseigné"
        >
          <section>
            <Label>Conditions générales</Label>
            <Textarea
              value={form.conditionsGenerales ?? ""}
              onChange={(e) => patch({ conditionsGenerales: e.target.value })}
              placeholder="Saisissez vos conditions générales de vente ou d'intervention…"
              rows={8}
            />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Champ optionnel. Laissez vide pour ne rien afficher dans les PDF.
            </p>
          </section>
        </ParametresSection>

        <ParametresSection
          title="Signatures"
          description="Textes de signature pour vos emails et documents PDF"
        >
          <section>
            <Label>Signature email</Label>
            <Textarea
              value={form.signatureEmail ?? ""}
              onChange={(e) => patch({ signatureEmail: e.target.value })}
              placeholder={"Cordialement,\nJean Dupont — BTP Pro Services"}
              rows={4}
            />
          </section>
          <section>
            <Label>Signature PDF</Label>
            <Textarea
              value={form.signaturePdf ?? ""}
              onChange={(e) => patch({ signaturePdf: e.target.value })}
              placeholder="Bloc de signature affiché en bas des devis PDF"
              rows={4}
            />
          </section>
        </ParametresSection>

        <ParametresSection
          title="Relances clients"
          description="Relances email automatiques pour les factures impayées"
        >
          <ParametresToggle
            label="Relances automatiques"
            description="Active l'envoi automatique des relances factures"
            checked={Boolean(form.relancesAutomatiques)}
            onChange={(relancesAutomatiques) => patch({ relancesAutomatiques })}
          />
          <ParametresToggle
            label="Rappel J-3"
            description="3 jours avant l'échéance — rappel doux"
            checked={Boolean(form.relanceAvantEcheance3j)}
            onChange={(relanceAvantEcheance3j) => patch({ relanceAvantEcheance3j })}
          />
          <ParametresToggle
            label="Rappel jour d'échéance"
            description="Le jour de l'échéance"
            checked={Boolean(form.relanceJourEcheance)}
            onChange={(relanceJourEcheance) => patch({ relanceJourEcheance })}
          />
          <ParametresToggle
            label="Relance J+7"
            description="7 jours après l'échéance"
            checked={Boolean(form.relanceJ7)}
            onChange={(relanceJ7) => patch({ relanceJ7 })}
          />
          <ParametresToggle
            label="Relance J+15"
            description="15 jours après l'échéance"
            checked={Boolean(form.relanceJ15)}
            onChange={(relanceJ15) => patch({ relanceJ15 })}
          />
          <ParametresToggle
            label="Relance ferme J+30"
            description="30 jours après l'échéance"
            checked={Boolean(form.relanceJ30)}
            onChange={(relanceJ30) => patch({ relanceJ30 })}
          />
        </ParametresSection>

        <ParametresSection
          title="MUM IA"
          description="Bibliothèque de prix et apprentissage automatique pour des devis plus précis"
        >
          <div className="space-y-3">
            <Link
              href="/parametres/mum-ia"
              className="flex items-center justify-between rounded-2xl border border-border/80 bg-card/60 px-4 py-4 transition-colors hover:border-primary/25 hover:bg-card-hover"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Sparkles className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    Paramètres MUM IA
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Apprentissage, zone géographique, import / export
                  </span>
                </span>
              </span>
              <span className="text-sm text-primary">Ouvrir →</span>
            </Link>
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
                    Bibliothèque entreprise
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Prix appris et manuels — consultables et modifiables
                  </span>
                </span>
              </span>
              <span className="text-sm text-primary">Ouvrir →</span>
            </Link>
          </div>
        </ParametresSection>

        <ParametresSection title="Apparence">
          <ParametresThemePicker
            value={normalizeThemePreference(form.theme)}
            onChange={(theme) => {
              patch({ theme });
              applyTheme(theme);
            }}
          />
        </ParametresSection>

        <footer
          className={cn(
            "sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-background/95 px-4 py-4 backdrop-blur-sm",
          )}
        >
          <Button type="submit" className="min-w-[140px]" disabled={saving || loadingSettings}>
            {saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={saving || loadingSettings}
            onClick={() => setConfirmResetOpen(true)}
          >
            Réinitialiser les données
          </Button>
        </footer>
        </fieldset>
      </form>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Confirmer la suppression"
        message="Cette action est définitive. Voulez-vous continuer ?"
        confirmLabel="Supprimer"
        variant="danger"
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          reset();
          setForm(normalizeParametres(data.parametres));
          setConfirmResetOpen(false);
        }}
      />
    </div>
  );
}

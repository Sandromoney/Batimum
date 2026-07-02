"use client";

import { useState } from "react";
import { ParametresSection } from "@/components/parametres-section";
import { ParametresToggle } from "@/components/parametres-toggle";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { validateParametresEFacturation } from "@/lib/facture-electronique";
import {
  electronicInvoiceService,
  getPdpConnexionStatutLabel,
  isPdpProviderImplemented,
  mergeParametresFacturationElectronique,
  PDP_PROVIDER_CATALOG,
  resolveParametresFacturationElectronique,
} from "@/lib/electronic-invoice";
import type { Parametres, PdpConnexionStatut } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2, Plug } from "lucide-react";

type ParametresFacturationElectroniqueSectionProps = {
  form: Parametres;
  onChange: (next: Parametres) => void;
  modified?: boolean;
};

function connexionBadgeClass(statut: PdpConnexionStatut): string {
  switch (statut) {
    case "test_ok":
    case "production_ok":
      return "border-primary/30 bg-primary/10 text-primary";
    case "test_erreur":
    case "production_erreur":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    default:
      return "border-border/80 bg-card-elevated/60 text-muted-foreground";
  }
}

export function ParametresFacturationElectroniqueSection({
  form,
  onChange,
  modified = false,
}: ParametresFacturationElectroniqueSectionProps) {
  const fe = resolveParametresFacturationElectronique(form);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  function patchFe(
    partial: Parameters<typeof mergeParametresFacturationElectronique>[1],
  ) {
    onChange(mergeParametresFacturationElectronique(form, partial));
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestMessage(null);

    const result = await electronicInvoiceService.testConnection(form);
    const testedAt = new Date().toISOString();

    if (!result.ok) {
      const statut: PdpConnexionStatut =
        fe.pdpEnvironnement === "production" ? "production_erreur" : "test_erreur";
      patchFe({
        pdpConnexionStatut: statut,
        pdpDernierTestLe: testedAt,
        pdpDernierTestMessage: result.error,
      });
      setTestMessage(result.error);
      setTesting(false);
      return;
    }

    const statut: PdpConnexionStatut =
      fe.pdpEnvironnement === "production" ? "production_ok" : "test_ok";
    patchFe({
      pdpConnexionStatut: statut,
      pdpDernierTestLe: testedAt,
      pdpDernierTestMessage: result.data.message,
    });
    setTestMessage(result.data.message);
    setTesting(false);
  }

  const providerReady = isPdpProviderImplemented(fe.pdpProviderId);

  return (
    <ParametresSection
      title="Facturation électronique"
      description="Préparation réforme 2026/2027 — architecture PDP prête, sans transmission active tant qu'un connecteur n'est pas branché"
      modified={modified}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="sm:col-span-2">
          <Label>PDP utilisée</Label>
          <Select
            value={fe.pdpProviderId ?? ""}
            onChange={(event) => {
              patchFe({
                pdpProviderId: event.target.value,
                pdpConnexionStatut: "non_configure",
                pdpDernierTestMessage: undefined,
              });
              setTestMessage(null);
            }}
          >
            {PDP_PROVIDER_CATALOG.map((provider) => (
              <option key={provider.id || "none"} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </Select>
          {fe.pdpProviderId && !providerReady ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Connecteur en préparation — la configuration est enregistrée pour une
              intégration future.
            </p>
          ) : null}
        </section>

        <section className="sm:col-span-2">
          <Label>Clé API PDP</Label>
          <Input
            type="password"
            value={fe.pdpApiKey ?? ""}
            onChange={(event) =>
              patchFe({
                pdpApiKey: event.target.value,
                pdpConnexionStatut: "non_configure",
              })
            }
            placeholder="À renseigner lors de la connexion PDP"
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Stockée localement sur cet appareil. Ne sera transmise qu&apos;au connecteur
            PDP lors de l&apos;activation officielle.
          </p>
        </section>

        <section>
          <Label>Mode</Label>
          <Select
            value={fe.pdpEnvironnement ?? "test"}
            onChange={(event) =>
              patchFe({
                pdpEnvironnement:
                  event.target.value === "production" ? "production" : "test",
                pdpConnexionStatut: "non_configure",
              })
            }
          >
            <option value="test">Test (bac à sable)</option>
            <option value="production">Production</option>
          </Select>
        </section>

        <section>
          <Label>Statut de connexion</Label>
          <div
            className={cn(
              "mt-1 flex min-h-[2.75rem] items-center rounded-xl border px-3 text-sm font-medium",
              connexionBadgeClass(fe.pdpConnexionStatut ?? "non_configure"),
            )}
          >
            {getPdpConnexionStatutLabel(fe.pdpConnexionStatut ?? "non_configure")}
          </div>
          {fe.pdpDernierTestLe ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Dernier test : {new Date(fe.pdpDernierTestLe).toLocaleString("fr-FR")}
            </p>
          ) : null}
        </section>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Le module <span className="font-medium text-foreground">ElectronicInvoiceService</span>{" "}
          centralise les futures transmissions. Aucune PDP n&apos;est connectée pour le
          moment.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleTestConnection()}
          disabled={testing || !fe.pdpProviderId}
          className="shrink-0"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Test en cours…
            </>
          ) : (
            <>
              <Plug className="h-4 w-4" />
              Tester la connexion
            </>
          )}
        </Button>
      </div>

      {testMessage || fe.pdpDernierTestMessage ? (
        <p className="mt-3 rounded-xl border border-border/80 bg-card-elevated/40 px-3 py-2 text-xs text-muted-foreground">
          {testMessage ?? fe.pdpDernierTestMessage}
        </p>
      ) : null}

      <ParametresToggle
        label="Entreprise prête facturation électronique"
        description="Active le contrôle des mentions obligatoires sur les factures"
        checked={Boolean(form.eFacturationPrete)}
        onChange={(eFacturationPrete) => onChange({ ...form, eFacturationPrete })}
      />

      {form.eFacturationPrete ? (
        <ul className="space-y-1.5 rounded-xl border border-border/80 bg-card-elevated/50 p-4 text-sm">
          {validateParametresEFacturation(form).map((mention) => (
            <li
              key={mention.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-foreground">{mention.label}</span>
              <span
                className={mention.ok ? "text-primary" : "text-warning-foreground"}
              >
                {mention.ok ? "OK" : "À compléter"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </ParametresSection>
  );
}

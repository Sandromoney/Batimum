"use client";

import { ParametresToggle } from "@/components/parametres-toggle";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  DEFAULT_DEVIS_RELANCE_REGLES,
  DEVIS_RELANCE_VARIABLES_HELP,
  type DevisRelanceRegle,
} from "@/lib/devis-relance-config";
import { generateId } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type ParametresDevisRelancesProps = {
  actif: boolean;
  regles: DevisRelanceRegle[];
  onActifChange: (actif: boolean) => void;
  onReglesChange: (regles: DevisRelanceRegle[]) => void;
};

export function ParametresDevisRelances({
  actif,
  regles,
  onActifChange,
  onReglesChange,
}: ParametresDevisRelancesProps) {
  function updateRegle(id: string, patch: Partial<DevisRelanceRegle>) {
    onReglesChange(
      regles.map((regle) => (regle.id === id ? { ...regle, ...patch } : regle)),
    );
  }

  function addCustomRegle() {
    onReglesChange([
      ...regles,
      {
        id: `custom_${generateId()}`,
        label: "Relance personnalisée",
        actif: true,
        joursApresEnvoi: 10,
        sujet: "Relance concernant votre devis {numero_devis}",
        message: `Bonjour {nom_client},

Nous revenons vers vous concernant le devis {numero_devis}.

Bien cordialement,
{nom_entreprise}`,
      },
    ]);
  }

  function removeRegle(id: string) {
    if (["j7", "j14", "j21"].includes(id)) {
      updateRegle(id, { actif: false });
      return;
    }
    onReglesChange(regles.filter((regle) => regle.id !== id));
  }

  function resetDefaults() {
    onReglesChange(DEFAULT_DEVIS_RELANCE_REGLES);
  }

  return (
    <section className="space-y-5">
      <ParametresToggle
        label="Relances automatiques des devis"
        description="Envoie des emails de relance pour les devis envoyés, non signés et non refusés"
        checked={actif}
        onChange={onActifChange}
      />

      <p className="text-xs text-muted-foreground">
        Variables disponibles : {DEVIS_RELANCE_VARIABLES_HELP}
      </p>

      <div className="space-y-4">
        {regles.map((regle) => (
          <article
            key={regle.id}
            className="rounded-2xl border border-border/80 bg-card-elevated/50 p-4"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ParametresToggle
                  label={regle.label}
                  description={`J+${regle.joursApresEnvoi} après l'envoi du devis`}
                  checked={regle.actif}
                  onChange={(value) => updateRegle(regle.id, { actif: value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="sr-only">Jours après envoi</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={regle.joursApresEnvoi}
                  disabled={!regle.actif}
                  onChange={(event) =>
                    updateRegle(regle.id, {
                      joursApresEnvoi: Math.max(
                        1,
                        Number(event.target.value) || regle.joursApresEnvoi,
                      ),
                    })
                  }
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">jours</span>
                {!["j7", "j14", "j21"].includes(regle.id) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeRegle(regle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              <section>
                <Label>Sujet du mail</Label>
                <Input
                  value={regle.sujet}
                  disabled={!regle.actif}
                  onChange={(event) =>
                    updateRegle(regle.id, { sujet: event.target.value })
                  }
                />
              </section>
              <section>
                <Label>Message</Label>
                <Textarea
                  value={regle.message}
                  disabled={!regle.actif}
                  rows={7}
                  onChange={(event) =>
                    updateRegle(regle.id, { message: event.target.value })
                  }
                />
              </section>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={addCustomRegle}>
          <Plus className="h-4 w-4" />
          Ajouter une relance personnalisée
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={resetDefaults}>
          Réinitialiser les messages par défaut
        </Button>
      </div>
    </section>
  );
}

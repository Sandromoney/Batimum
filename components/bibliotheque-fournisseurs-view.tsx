"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, PhoneInput, Textarea } from "@/components/ui/input";
import { FournisseurDeleteModal } from "@/components/fournisseur-delete-modal";
import { FournisseurDepotPicker } from "@/components/fournisseur-depot-picker";
import { normalizeEntreprisePriceLibrary } from "@/lib/entreprise-price-library/normalize";
import {
  countTarifsForFournisseur,
  filterFournisseursForCompany,
  getFournisseurDepotLabel,
  getFournisseurEnseigneLabel,
  getFournisseurStatusLabel,
  isFournisseurArchived,
} from "@/lib/fourniture/helpers";
import {
  findFournisseurByOsmId,
  normalizeFournisseur,
  touchFournisseurUpdated,
} from "@/lib/fourniture/fournisseur-storage";
import type { Fournisseur, Parametres } from "@/lib/types";
import { formatDateFR } from "@/lib/utils";

type Props = {
  parametres: Parametres;
  companyId: string;
  onParametresChange: (patch: Partial<Parametres>) => void;
};

export function BibliothequeFournisseursView({
  parametres,
  companyId,
  onParametresChange,
}: Props) {
  const safeFournisseurs = filterFournisseursForCompany(
    parametres.fournisseurs ?? [],
    companyId,
  );
  const safeTarifs = parametres.tarifsFournisseurs ?? [];
  const normalizedLibrary = useMemo(
    () =>
      normalizeEntreprisePriceLibrary(parametres.entreprisePriceLibrary, companyId),
    [parametres.entreprisePriceLibrary, companyId],
  );

  const [openedId, setOpenedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const opened = safeFournisseurs.find((item) => item.id === openedId) ?? null;
  const deleteTarget =
    safeFournisseurs.find((item) => item.id === deleteTargetId) ?? null;
  const deleteProductCount = deleteTarget
    ? countTarifsForFournisseur(safeTarifs, deleteTarget.id)
    : 0;

  useEffect(() => {
    if (!highlightedId) return;
    const timer = window.setTimeout(() => setHighlightedId(null), 1200);
    return () => window.clearTimeout(timer);
  }, [highlightedId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function patch(next: Partial<Parametres>) {
    onParametresChange(next);
  }

  function scrollToFiche() {
    window.requestAnimationFrame(() => {
      document.getElementById("fournisseur-detail")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function openFournisseur(id: string) {
    setOpenedId(id);
    scrollToFiche();
  }

  function addFournisseur(fournisseur: Fournisseur): boolean {
    const normalized = normalizeFournisseur(fournisseur);

    if (normalized.osmId) {
      const existing = findFournisseurByOsmId(
        parametres.fournisseurs ?? [],
        companyId,
        normalized.osmId,
      );
      if (existing) {
        openFournisseur(existing.id);
        return false;
      }
    }

    patch({
      fournisseurs: [
        ...(parametres.fournisseurs ?? []),
        { ...normalized, status: "active" },
      ],
    });
    setHighlightedId(normalized.id);
    setOpenedId(null);
    return true;
  }

  function updateFournisseur(next: Fournisseur) {
    patch({
      fournisseurs: (parametres.fournisseurs ?? []).map((item) =>
        item.id === next.id ? touchFournisseurUpdated(next) : item,
      ),
    });
  }

  function archiveFournisseur(id: string) {
    const current = safeFournisseurs.find((item) => item.id === id);
    if (!current) return;
    updateFournisseur({ ...current, status: "archived" });
    setDeleteTargetId(null);
    setNotice(`${getFournisseurEnseigneLabel(current)} a été archivé.`);
  }

  function reactivateFournisseur(id: string) {
    const current = safeFournisseurs.find((item) => item.id === id);
    if (!current) return;
    updateFournisseur({ ...current, status: "active" });
    setNotice(`${getFournisseurEnseigneLabel(current)} a été réactivé.`);
  }

  function confirmDeleteFournisseur(id: string) {
    // Re-vérification atomique du nombre de produits liés (état courant).
    const liveCount = countTarifsForFournisseur(
      parametres.tarifsFournisseurs ?? [],
      id,
    );
    const expected = countTarifsForFournisseur(safeTarifs, id);
    if (liveCount !== expected) {
      setNotice(
        "Les données ont changé. Rouvrez la suppression pour confirmer à nouveau.",
      );
      setDeleteTargetId(null);
      return;
    }

    const nextLibrary = {
      ...normalizedLibrary,
      entries: normalizedLibrary.entries.filter((entry) => entry.supplierId !== id),
    };

    patch({
      fournisseurs: (parametres.fournisseurs ?? []).filter((item) => item.id !== id),
      tarifsFournisseurs: (parametres.tarifsFournisseurs ?? []).filter(
        (line) => line.fournisseurId !== id,
      ),
      entreprisePriceLibrary: nextLibrary,
    });

    if (openedId === id) setOpenedId(null);
    setDeleteTargetId(null);
    setNotice("Le fournisseur a été supprimé.");
  }

  return (
    <div className="space-y-8">
      <FournisseurDepotPicker
        parametres={parametres}
        companyId={companyId}
        existingFournisseurs={safeFournisseurs.filter(
          (item) => !isFournisseurArchived(item),
        )}
        onAddFournisseur={addFournisseur}
      />

      {notice ? (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-950">
          {notice}
        </div>
      ) : null}

      <Card className="border-border/70 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Mes fournisseurs</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {safeFournisseurs.length} fournisseur(s) enregistré(s)
          </p>
        </div>

        {safeFournisseurs.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Aucun fournisseur — ajoutez-en un ci-dessus.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/80">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border/70">
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Dépôt</th>
                  <th className="px-3 py-2">Ville</th>
                  <th className="px-3 py-2">Produits</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Dernière MAJ</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {safeFournisseurs.map((item) => {
                  const productCount = countTarifsForFournisseur(
                    safeTarifs,
                    item.id,
                  );
                  const lastUpdate =
                    item.dateDerniereMiseAJour ?? item.dateAjout ?? null;
                  const archived = isFournisseurArchived(item);

                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-border/50 odd:bg-white even:bg-neutral-50/40 ${
                        highlightedId === item.id ? "fournisseur-row-added" : ""
                      } ${archived ? "opacity-70" : ""}`}
                    >
                      <td className="px-3 py-2.5 font-medium">
                        {getFournisseurEnseigneLabel(item)}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {getFournisseurDepotLabel(item)}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {[item.ville, item.codePostal].filter(Boolean).join(" ") ||
                          "—"}
                      </td>
                      <td className="px-3 py-2.5">{productCount}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            archived
                              ? "border-border text-muted-foreground"
                              : "border-emerald-200 text-emerald-700"
                          }`}
                        >
                          {getFournisseurStatusLabel(item)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {lastUpdate ? formatDateFR(lastUpdate.slice(0, 10)) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openFournisseur(item.id)}
                          >
                            Modifier
                          </Button>
                          {archived ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => reactivateFournisseur(item.id)}
                            >
                              Réactiver
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-700 hover:text-red-800"
                            onClick={() => setDeleteTargetId(item.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {opened ? (
        <div id="fournisseur-detail">
          <Card className="border-border/70 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  {getFournisseurEnseigneLabel(opened)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {getFournisseurDepotLabel(opened)} ·{" "}
                  {getFournisseurStatusLabel(opened)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setOpenedId(null)}
              >
                Fermer
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <section>
                <Label>Nom du fournisseur</Label>
                <Input
                  value={opened.enseigne ?? opened.nom}
                  onChange={(e) =>
                    updateFournisseur({
                      ...opened,
                      nom: e.target.value,
                      enseigne: e.target.value,
                    })
                  }
                />
              </section>
              <section>
                <Label>Nom du dépôt</Label>
                <Input
                  value={opened.nomDepot ?? ""}
                  onChange={(e) =>
                    updateFournisseur({ ...opened, nomDepot: e.target.value })
                  }
                />
              </section>
              <section className="sm:col-span-2">
                <Label>Adresse</Label>
                <Input
                  value={opened.adresseDepot}
                  onChange={(e) =>
                    updateFournisseur({ ...opened, adresseDepot: e.target.value })
                  }
                />
              </section>
              <section>
                <Label>Ville</Label>
                <Input
                  value={opened.ville}
                  onChange={(e) =>
                    updateFournisseur({ ...opened, ville: e.target.value })
                  }
                />
              </section>
              <section>
                <Label>Code postal</Label>
                <Input
                  value={opened.codePostal}
                  onChange={(e) =>
                    updateFournisseur({ ...opened, codePostal: e.target.value })
                  }
                />
              </section>
              <section>
                <Label>Téléphone</Label>
                <PhoneInput
                  mode="auto"
                  value={opened.telephone ?? ""}
                  onChangeValue={(telephone) =>
                    updateFournisseur({ ...opened, telephone })
                  }
                />
              </section>
              <section>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={opened.email ?? ""}
                  onChange={(e) =>
                    updateFournisseur({ ...opened, email: e.target.value })
                  }
                />
              </section>
              <section className="sm:col-span-2">
                <Label>Site web</Label>
                <Input
                  value={opened.siteWeb ?? ""}
                  onChange={(e) =>
                    updateFournisseur({ ...opened, siteWeb: e.target.value })
                  }
                />
              </section>
              <section className="sm:col-span-2">
                <Label>Commentaire</Label>
                <Textarea
                  rows={2}
                  value={opened.commentaireInterne ?? ""}
                  onChange={(e) =>
                    updateFournisseur({
                      ...opened,
                      commentaireInterne: e.target.value,
                    })
                  }
                />
              </section>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {isFournisseurArchived(opened) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => reactivateFournisseur(opened.id)}
                >
                  Réactiver
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => archiveFournisseur(opened.id)}
                >
                  Archiver
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-700"
                onClick={() => setDeleteTargetId(opened.id)}
              >
                Supprimer
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <FournisseurDeleteModal
        open={Boolean(deleteTarget)}
        fournisseur={deleteTarget}
        productCount={deleteProductCount}
        onClose={() => setDeleteTargetId(null)}
        onConfirmDelete={confirmDeleteFournisseur}
        onArchive={archiveFournisseur}
      />
    </div>
  );
}

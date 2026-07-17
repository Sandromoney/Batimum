/**
 * Construit un contexte entreprise minimal selon l'intention détectée (mots-clés).
 * Ne jamais envoyer toute la base.
 */
import type { AppData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export type AssistantContextBundle = {
  intentHint: string;
  sourcesUsed: string[];
  contextText: string;
};

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

export function buildAssistantEnterpriseContext(
  data: AppData,
  message: string,
): AssistantContextBundle {
  const n = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const sources: string[] = ["entreprise"];
  const chunks: string[] = [];

  chunks.push(
    `Entreprise: ${data.parametres.entreprise || "—"}\nUtilisateur: ${data.parametres.utilisateur || "—"}`,
  );

  const wantsDevis = includesAny(n, [
    "devis",
    "relance",
    "signe",
    "brouillon",
    "dev-",
  ]);
  const wantsFactures = includesAny(n, [
    "facture",
    "encaisse",
    "impaye",
    "paiement",
    "tva",
  ]);
  const wantsChantiers = includesAny(n, [
    "chantier",
    "marge",
    "rentab",
    "budget",
    "rentabil",
  ]);
  const wantsEmployes = includesAny(n, [
    "employe",
    "equipe",
    "pointage",
    "lucas",
    "qui",
    "present",
  ]);
  const wantsPlanning = includesAny(n, [
    "planning",
    "demain",
    "aujourd",
    "affectation",
    "rdv",
  ]);
  const wantsFournisseurs = includesAny(n, [
    "fournisseur",
    "gedimat",
    "point.p",
    "point p",
    "cedeo",
    "ba13",
    "tarif",
    "compare",
    "comparatif",
    "produit",
  ]);
  const wantsPilotage = includesAny(n, [
    "pilotage",
    "ca",
    "chiffre",
    "aujourd",
    "alerte",
    "traiter",
    "faire",
    "stat",
  ]);

  let intentHint = "general";

  if (wantsDevis) {
    intentHint = "devis";
    sources.push("devis", "clients");
    const devis = [...data.devis]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 25)
      .map((d) => {
        const client = data.clients.find((c) => c.id === d.clientId);
        return `- ${d.numero || d.id} | ${d.statut} | ${client?.nom || "?"} | ${formatCurrency(d.montantHT ?? 0)} HT | ${d.titre || ""}`;
      });
    chunks.push(`Devis récents (${devis.length}):\n${devis.join("\n") || "Aucun"}`);
  }

  if (wantsFactures) {
    intentHint = wantsDevis ? "devis_factures" : "factures";
    sources.push("factures");
    const factures = [...data.factures]
      .sort((a, b) => (b.dateEmission || "").localeCompare(a.dateEmission || ""))
      .slice(0, 25)
      .map((f) => {
        const client = data.clients.find((c) => c.id === f.clientId);
        return `- ${f.numero || f.id} | ${f.statut} | ${client?.nom || "?"} | ${formatCurrency(f.montantHT ?? f.montant ?? 0)} HT | paiement:${f.datePaiement || "—"}`;
      });
    chunks.push(
      `Factures récentes (${factures.length}):\n${factures.join("\n") || "Aucune"}`,
    );
  }

  if (wantsChantiers || wantsPilotage) {
    if (!wantsDevis && !wantsFactures) intentHint = "chantiers";
    sources.push("chantiers", "achats");
    const chantiers = data.chantiers.slice(0, 20).map((c) => {
      const achats = (c.achats ?? []).reduce((s, a) => s + (a.montantHT ?? 0), 0);
      return `- ${c.nom} | ${c.statut} | type:${c.type || "—"} | achats:${formatCurrency(achats)}`;
    });
    chunks.push(`Chantiers (${chantiers.length}):\n${chantiers.join("\n") || "Aucun"}`);
  }

  if (wantsEmployes || wantsPlanning) {
    if (intentHint === "general") intentHint = "equipes";
    sources.push("employes", "pointages");
    const employes = data.employes
      .filter((e) => e.statut !== "desactive")
      .slice(0, 30)
      .map(
        (e) =>
          `- ${e.prenom} ${e.nom} | ${e.poste || "—"} | cout/h:${e.coutHoraireInterne ?? "—"}`,
      );
    chunks.push(`Employés:\n${employes.join("\n") || "Aucun"}`);

    const today = new Date().toISOString().slice(0, 10);
    const entries = (data.chantierTimeEntries ?? [])
      .filter((e) => e.date >= today.slice(0, 8) || e.date.slice(0, 7) === today.slice(0, 7))
      .slice(0, 40)
      .map((e) => {
        const emp = data.employes.find((x) => x.id === e.employeId);
        const ch = data.chantiers.find((x) => x.id === e.chantierId);
        return `- ${e.date} ${e.heureDebut}-${e.heureFin} | ${emp?.prenom || "?"} | ${ch?.nom || "?"}`;
      });
    chunks.push(`Pointages récents:\n${entries.join("\n") || "Aucun"}`);
  }

  if (wantsPlanning) {
    intentHint = "planning";
    sources.push("planning");
    const planning = [...(data.planning ?? [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 30)
      .map((p) => {
        const names = (p.employeIds ?? [])
          .map((id) => data.employes.find((e) => e.id === id))
          .filter(Boolean)
          .map((e) => `${e!.prenom} ${e!.nom}`)
          .join(", ");
        const ch = data.chantiers.find((c) => c.id === p.chantierId);
        return `- ${p.date} ${p.heureDebut}-${p.heureFin} | ${p.titre} | ${ch?.nom || "—"} | ${names || "—"}`;
      });
    chunks.push(`Planning:\n${planning.join("\n") || "Aucun"}`);
  }

  if (wantsFournisseurs) {
    intentHint = "fournisseurs";
    sources.push("fournisseurs", "produits");
    const fournisseurs = (data.parametres.fournisseurs ?? [])
      .filter((f) => f.status !== "archived")
      .slice(0, 20)
      .map((f) => `- ${f.enseigne || f.nom} | ${f.ville || ""}`);
    chunks.push(`Fournisseurs:\n${fournisseurs.join("\n") || "Aucun"}`);

    const products = (data.parametres.entreprisePriceLibrary?.entries ?? [])
      .filter((e) => !e.desactive && e.purchasePriceHT != null)
      .slice(0, 40)
      .map(
        (e) =>
          `- ${e.name} | ${e.supplierName || "?"} | ${e.purchasePriceHT} € HT | ${e.unit}`,
      );
    chunks.push(`Produits (extrait):\n${products.join("\n") || "Aucun"}`);
  }

  if (wantsPilotage && intentHint === "general") {
    intentHint = "pilotage";
  }

  // Clients si devis/factures ou question client
  if (
    wantsDevis ||
    wantsFactures ||
    includesAny(n, ["client", "dupont", "martin"])
  ) {
    sources.push("clients");
    const clients = data.clients.slice(0, 30).map(
      (c) => `- ${c.nom} | ${c.email || "—"} | ${c.telephone || "—"}`,
    );
    chunks.push(`Clients:\n${clients.join("\n") || "Aucun"}`);
  }

  // Fallback léger si rien de ciblé
  if (chunks.length <= 1) {
    intentHint = "overview";
    sources.push("devis", "factures", "chantiers");
    chunks.push(
      `Synthèse: ${data.devis.length} devis, ${data.factures.length} factures, ${data.chantiers.length} chantiers, ${data.employes.length} employés.`,
    );
  }

  return {
    intentHint,
    sourcesUsed: [...new Set(sources)],
    contextText: chunks.join("\n\n"),
  };
}

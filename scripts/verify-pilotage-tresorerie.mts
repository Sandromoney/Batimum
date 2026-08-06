/**
 * Vérifie trésorerie Pilotage (données réelles uniquement).
 * npx tsx --tsconfig tsconfig.json scripts/verify-pilotage-tresorerie.mts
 */
import assert from "node:assert/strict";
import { computeDepenseAmounts, type PilotageDepense } from "../lib/pilotage/depenses.ts";
import { normalizeFactureFournisseurExtraction } from "../lib/pilotage/facture-fournisseur-ia.ts";
import { buildPilotageTresorerie } from "../lib/pilotage/tresorerie.ts";
import type { AppData, Chantier, Devis, Facture } from "../lib/types.ts";

const devis: Devis[] = [
  {
    id: "d1",
    numero: "DEV-1",
    clientId: "c1",
    titre: "Cuisine",
    lignes: [],
    statut: "signe",
    date: "2026-08-20",
    dateCreation: "2026-08-01T10:00:00.000Z",
    montantHT: 1000,
    montantTTC: 1200,
    validiteJours: 30,
  },
];

const factures: Facture[] = [
  {
    id: "f1",
    numero: "FAC-1",
    clientId: "c1",
    montant: 600,
    montantHT: 500,
    montantTTC: 600,
    statut: "payee",
    dateEmission: "2026-07-01",
    dateEcheance: "2026-07-31",
    datePaiement: "2026-07-15",
  },
  {
    id: "f2",
    numero: "FAC-2",
    clientId: "c1",
    montant: 240,
    montantHT: 200,
    montantTTC: 240,
    statut: "envoyee",
    dateEmission: "2026-08-01",
    dateEcheance: "2026-08-20",
  },
];

const chantiers: Chantier[] = [
  {
    id: "ch1",
    nom: "Chantier A",
    clientId: "c1",
    adresse: "1 rue Test",
    statut: "en_cours",
    dateDebut: "2026-07-01",
    dateFin: "2026-09-01",
    budget: 2000,
    achats: [
      {
        id: "a1",
        fournisseur: "Point.P",
        libelle: "Ciment",
        montantHT: 100,
        tauxTVA: 20,
        date: "2026-07-10",
        categorie: "materiaux",
      },
    ],
  },
];

const depenses: PilotageDepense[] = [
  {
    id: "p1",
    fournisseur: "Location Pro",
    libelle: "Nacelle",
    date: "2026-07-12",
    ...computeDepenseAmounts({ montantHT: 80, tauxTVA: 20 }),
    source: "manuel",
    createdAt: "2026-07-12T10:00:00.000Z",
  },
];

const data = {
  devis,
  factures,
  chantiers,
  clients: [],
  commandes: [],
  avoirs: [],
  employes: [],
  planning: [],
  affectations: [],
  notifications: [],
  deletedNotificationKeys: [],
  relances: [],
} as unknown as AppData;

const model = buildPilotageTresorerie(data, depenses, {
  referenceDate: new Date("2026-08-06T12:00:00.000Z"),
});

// Encaissé 600 − dépenses (120 + 96) = 384
assert.equal(model.tresorerieActuelle, 384);
assert.equal(model.depensesTotalHT, 180);
assert.equal(model.depensesTotalTTC, 216);
// Recettes : facture ouverte 240 + devis signé 1200
assert.equal(model.recettesPrevuesTTC, 1440);
assert.equal(model.recettesPrevuesHT, 1200);
assert.equal(model.margePrevisionnelleHT, 1020);
assert.ok(model.points.length === 8);

const extraction = normalizeFactureFournisseurExtraction({
  fournisseur: "Point.P",
  date: "15/07/2026",
  montantHT: 100,
  tauxTVA: 20,
  montantTVA: null,
  montantTTC: 120,
});
assert.equal(extraction.fournisseur, "Point.P");
assert.equal(extraction.date, "2026-07-15");
assert.equal(extraction.montantTVA, 20);

console.log("verify-pilotage-tresorerie: ok");

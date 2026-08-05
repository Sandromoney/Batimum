/**
 * Vérifie résumé fiche client (compteurs + timeline).
 * node --experimental-strip-types scripts/verify-client-fiche.mts
 */
import assert from "node:assert/strict";
import {
  buildClientFicheTimeline,
  computeClientFicheSummary,
} from "../lib/client-fiche.ts";
import type { AppData, Client, Devis, Facture, Chantier } from "../lib/types.ts";

const client: Client = {
  id: "c1",
  nom: "Martin",
  prenom: "Alice",
  telephone: "0600000000",
  adresse: "1 rue Test",
  codePostal: "75001",
  ville: "Paris",
  createdAt: "2026-01-01T10:00:00.000Z",
  historique: [
    {
      id: "h1",
      type: "cree",
      label: "Client créé.",
      date: "2026-01-01T10:00:00.000Z",
    },
  ],
};

const devis: Devis[] = [
  {
    id: "d1",
    numero: "DEV-1",
    clientId: "c1",
    titre: "Salle de bain",
    lignes: [],
    statut: "brouillon",
    date: "2026-02-01",
    dateCreation: "2026-02-01T12:00:00.000Z",
    montantTTC: 1000,
    validiteJours: 30,
  },
  {
    id: "d2",
    numero: "DEV-2",
    clientId: "c1",
    titre: "Cuisine",
    lignes: [],
    statut: "signe",
    date: "2026-03-01",
    dateCreation: "2026-03-01T12:00:00.000Z",
    montantTTC: 2000,
    validiteJours: 30,
  },
];

const factures: Facture[] = [
  {
    id: "f1",
    numero: "FAC-1",
    clientId: "c1",
    montant: 500,
    montantTTC: 500,
    statut: "payee",
    dateEmission: "2026-03-10",
    dateEcheance: "2026-04-10",
  },
  {
    id: "f2",
    numero: "FAC-2",
    clientId: "c1",
    montant: 300,
    montantTTC: 300,
    statut: "envoyee",
    dateEmission: "2026-03-15",
    dateEcheance: "2026-04-15",
  },
];

const chantiers: Chantier[] = [
  {
    id: "ch1",
    nom: "Chantier A",
    clientId: "c1",
    adresse: "1 rue Test",
    statut: "en_cours",
    dateDebut: "2026-03-05",
    dateFin: "2026-04-05",
    budget: 2500,
  },
];

const data = {
  clients: [client],
  devis,
  factures,
  chantiers,
  commandes: [],
} as unknown as AppData;

const summary = computeClientFicheSummary(data, "c1", client);
assert.equal(summary.devisTotal, 2);
assert.equal(summary.devisBrouillons, 1);
assert.equal(summary.devisSignes, 1);
assert.equal(summary.chantiersEnCours, 1);
assert.equal(summary.factures, 2);
assert.equal(summary.montantFacture, 800);
assert.equal(summary.montantEncaisse, 500);
assert.equal(summary.montantDu, 300);

const timeline = buildClientFicheTimeline(data, client);
assert.ok(timeline.some((e) => e.title.includes("Client créé")));
assert.ok(timeline.some((e) => e.title.includes("DEV-1")));
assert.ok(timeline.some((e) => e.kind === "facture"));

console.log("verify-client-fiche: ok");

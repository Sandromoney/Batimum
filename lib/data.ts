import { DEFAULT_PARAMETRES } from "./parametres";
import { DEFAULT_BIBLIOTHEQUE_ENTREPRISE } from "./bibliotheque-entreprise";
import type { AppData } from "./types";

export const defaultData: AppData = {
  parametres: DEFAULT_PARAMETRES,
  bibliothequeEntreprise: DEFAULT_BIBLIOTHEQUE_ENTREPRISE,
  mumIaHistorique: [],
  clients: [
    {
      id: "c1",
      typeClient: "particulier",
      nom: "Martin Rénovation",
      email: "contact@martin-renov.fr",
      telephone: "06 12 34 56 78",
      adresse: "5 av. Victor Hugo",
      codePostal: "69003",
      ville: "Lyon",
      createdAt: "2025-01-15",
    },
    {
      id: "c2",
      typeClient: "professionnel",
      nom: "SCI Les Terrasses",
      email: "gestion@terrasses.fr",
      telephone: "04 78 90 12 34",
      adresse: "22 bd. de la République",
      codePostal: "69100",
      ville: "Villeurbanne",
      createdAt: "2025-02-20",
    },
    {
      id: "c3",
      typeClient: "professionnel",
      nom: "Hôtel Le Central",
      email: "direction@hotel-central.fr",
      telephone: "04 72 11 22 33",
      adresse: "Place Bellecour",
      codePostal: "69002",
      ville: "Lyon",
      createdAt: "2025-03-10",
    },
  ],
  devis: [
    {
      id: "d0",
      numero: "DEV-2025-003",
      clientId: "c3",
      titre: "Isolation combles",
      statut: "brouillon",
      date: "2025-05-10",
      validiteJours: 30,
      lignes: [
        {
          id: "l0",
          description: "Diagnostic thermique",
          quantite: 1,
          prixUnitaire: 450,
        },
      ],
    },
    {
      id: "d1",
      numero: "DEV-2025-001",
      clientId: "c1",
      titre: "Rénovation salle de bain",
      statut: "envoye",
      date: "2025-04-01",
      validiteJours: 30,
      lignes: [
        {
          id: "l1",
          description: "Dépose ancien carrelage",
          quantite: 12,
          prixUnitaire: 35,
        },
        {
          id: "l2",
          description: "Pose carrelage premium",
          quantite: 12,
          prixUnitaire: 85,
        },
        {
          id: "l3",
          description: "Plomberie complète",
          quantite: 1,
          prixUnitaire: 1200,
        },
      ],
    },
    {
      id: "d2",
      numero: "DEV-2025-002",
      clientId: "c2",
      titre: "Terrasse bois composite",
      statut: "accepte",
      date: "2025-04-10",
      validiteJours: 45,
      lignes: [
        {
          id: "l4",
          description: "Structure aluminium",
          quantite: 45,
          prixUnitaire: 120,
        },
        {
          id: "l5",
          description: "Lames composite",
          quantite: 45,
          prixUnitaire: 95,
        },
      ],
    },
    {
      id: "d3",
      numero: "DEV-2025-004",
      clientId: "c1",
      titre: "Extension garage",
      statut: "refuse",
      date: "2025-03-01",
      validiteJours: 30,
      lignes: [
        {
          id: "l6",
          description: "Maçonnerie",
          quantite: 1,
          prixUnitaire: 3200,
        },
      ],
    },
  ],
  chantiers: [
    {
      id: "ch1",
      nom: "SDB Martin - Phase 1",
      clientId: "c1",
      adresse: "5 av. Victor Hugo, Lyon",
      statut: "en_cours",
      type: "salle_de_bain",
      etapes: [
        { id: "ech1-1", titre: "Dépose existant", fait: true, poids: 1 },
        { id: "ech1-2", titre: "Plomberie", fait: true, poids: 2 },
        { id: "ech1-3", titre: "Électricité", fait: false, poids: 1 },
        { id: "ech1-4", titre: "Support / placo", fait: false, poids: 1 },
        { id: "ech1-5", titre: "Étanchéité", fait: false, poids: 2 },
        { id: "ech1-6", titre: "Carrelage / faïence", fait: false, poids: 2 },
        { id: "ech1-7", titre: "Pose sanitaires", fait: false, poids: 1 },
        { id: "ech1-8", titre: "Finitions", fait: false, poids: 1 },
        { id: "ech1-9", titre: "Réception", fait: false, poids: 1 },
      ],
      dateDebut: "2025-05-01",
      dateFin: "2025-06-15",
      budget: 8500,
    },
    {
      id: "ch2",
      nom: "Terrasse SCI Les Terrasses",
      clientId: "c2",
      adresse: "22 bd. de la République, Villeurbanne",
      statut: "planifie",
      type: "extension",
      etapes: [
        { id: "ech2-1", titre: "Préparation chantier", fait: false, poids: 1 },
        { id: "ech2-2", titre: "Terrassement / fondations", fait: false, poids: 2 },
        { id: "ech2-3", titre: "Maçonnerie / structure", fait: false, poids: 2 },
        { id: "ech2-4", titre: "Charpente / couverture", fait: false, poids: 2 },
        { id: "ech2-5", titre: "Menuiseries", fait: false, poids: 1 },
        { id: "ech2-6", titre: "Réseaux techniques", fait: false, poids: 2 },
        { id: "ech2-7", titre: "Isolation / finitions", fait: false, poids: 2 },
        { id: "ech2-8", titre: "Réception chantier", fait: false, poids: 1 },
      ],
      dateDebut: "2025-06-01",
      dateFin: "2025-07-30",
      budget: 12000,
    },
  ],
  commandes: [],
  factures: [
    {
      id: "f1",
      numero: "FAC-2025-001",
      clientId: "c1",
      chantierId: "ch1",
      montant: 4250,
      statut: "envoyee",
      dateEmission: "2025-05-15",
      dateEcheance: "2025-06-15",
    },
    {
      id: "f2",
      numero: "FAC-2025-002",
      clientId: "c2",
      montant: 6000,
      statut: "payee",
      dateEmission: "2025-04-20",
      dateEcheance: "2025-05-20",
      datePaiement: "2025-04-20",
    },
  ],
  employes: [
    {
      id: "emp1",
      prenom: "Lucas",
      nom: "Bernard",
      poste: "Chef d'équipe",
    },
    {
      id: "emp2",
      prenom: "Sophie",
      nom: "Martin",
      poste: "Maçonne",
    },
    {
      id: "emp3",
      prenom: "Karim",
      nom: "Dubois",
      poste: "Électricien",
    },
  ],
  planning: [
    {
      id: "p1",
      titre: "Dépose carrelage - Martin",
      chantierId: "ch1",
      date: "2025-05-20",
      heureDebut: "08:00",
      heureFin: "12:00",
      type: "intervention",
      employeIds: ["emp1", "emp2"],
    },
    {
      id: "p2",
      titre: "Réunion client SCI",
      date: "2025-05-22",
      heureDebut: "14:00",
      heureFin: "15:30",
      type: "reunion_chantier",
      employeIds: ["emp1"],
    },
    {
      id: "p3",
      titre: "Livraison matériaux",
      chantierId: "ch2",
      date: "2025-05-28",
      heureDebut: "07:30",
      heureFin: "09:00",
      type: "livraison_materiaux",
      employeIds: ["emp3"],
    },
  ],
  affectations: [],
  notifications: [],
  deletedNotificationKeys: [],
  relances: [],
  avoirs: [],
};

import { isSectionLigne } from "@/lib/devis-lignes";

export function devisTotal(devis: AppData["devis"][0]): number {
  if (devis.lignes.length === 0 && typeof devis.montantHT === "number") {
    return devis.montantHT;
  }

  return devis.lignes.reduce((sum, ligne) => {
    if (isSectionLigne(ligne)) return sum;
    return sum + ligne.quantite * ligne.prixUnitaire;
  }, 0);
}

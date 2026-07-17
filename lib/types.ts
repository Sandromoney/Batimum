export type StatutDevis =
  | "brouillon"
  | "envoye"
  | "accepte"
  | "refuse"
  | "signe"
  | "en_attente"
  | "en_retard"
  | "expire"
  | "archive";

export type DevisHistoriqueType =
  | "cree"
  | "envoye"
  | "signe"
  | "modifie"
  | "refuse"
  | "expire"
  | "archive"
  | "commande_liee"
  | "facture_liee"
  | "chantier_lie"
  | "ia_genere"
  | "ia_transforme_brouillon";

export interface DevisHistoriqueEntry {
  id: string;
  type: DevisHistoriqueType;
  label: string;
  date: string;
  meta?: Record<string, string>;
}
export type StatutFacture =
  | "brouillon"
  | "envoyee"
  | "payee"
  | "en_attente"
  | "en_retard"
  | "avoir_partiel"
  | "avoir_total";
export type StatutChantier =
  | "planifie"
  | "en_cours"
  | "retard_demarrage"
  | "en_retard"
  | "termine"
  | "suspendu";

export type ChantierHistoriqueType =
  | "cree"
  | "demarre"
  | "termine"
  | "en_retard"
  | "retard_demarrage"
  | "termine_apres_retard"
  | "commande_liee"
  | "facture_liee"
  | "devis_lie"
  | "intervention_terminee";

export interface ChantierHistoriqueEntry {
  id: string;
  type: ChantierHistoriqueType;
  label: string;
  date: string;
  meta?: Record<string, string>;
}
export type TypeChantier =
  | "renovation"
  | "maison_neuve"
  | "extension"
  | "salle_de_bain"
  | "cuisine"
  | "autre";

export type TypeClient = "particulier" | "professionnel";

export interface Client {
  id: string;
  typeClient?: TypeClient;
  nom: string;
  prenom?: string;
  societe?: string;
  email?: string;
  indicatifTelephone?: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  ville: string;
  siret?: string;
  tvaIntracom?: string;
  codeApe?: string;
  createdAt: string;
  historique?: ClientHistoriqueEntry[];
}

export type ClientHistoriqueType =
  | "cree"
  | "modifie"
  | "devis_lie"
  | "commande_liee"
  | "facture_liee"
  | "chantier_lie";

export interface ClientHistoriqueEntry {
  id: string;
  type: ClientHistoriqueType;
  label: string;
  date: string;
  meta?: Record<string, string>;
}

export type TypeLigneDevis = "ligne" | "section" | "forfait";

export interface LigneDevis {
  id: string;
  description: string;
  quantite: number;
  unite?: string;
  prixUnitaire: number;
  /** 0, 5.5, 10 ou 20 — absent = taux du devis. */
  tauxTVA?: number;
  /** Distinct du taux 0 % : mention « TVA non applicable ». */
  tvaNonApplicable?: boolean;
  typeLigne?: TypeLigneDevis;
  designation?: string;
  descriptionCourte?: string;
  /** Coût d'achat HT — usage interne, jamais sur PDF client. */
  prixAchatHT?: number;
  /** Fournisseur matériau — usage interne. */
  fournisseur?: string;
}

/** Catégories pour l'analyse pilotage / rentabilité. */
export type CategoriePilotageChantier =
  | "depannage"
  | "salle_de_bain"
  | "carrelage"
  | "placo"
  | "renovation_complete"
  | "long_chantier"
  | "petit_chantier"
  | "autre";

export interface DevisPilotageMainOeuvre {
  heuresPrevues?: number;
  tauxHoraireInterne?: number;
  employesPrevusIds?: string[];
}

export type ChantierTimeEntryTypeTache =
  | "preparation"
  | "pose"
  | "finition"
  | "deplacement"
  | "autre";

export interface ChantierTimeEntry {
  id: string;
  chantierId: string;
  employeId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  pauseMinutes: number;
  typeTache: ChantierTimeEntryTypeTache;
  typeTachePersonnalise?: string;
  commentaire?: string;
  createdAt: string;
}

export type PilotageFiabiliteNiveau =
  | "fiable"
  | "partiel"
  | "estimatif"
  | "non_calculable";

export interface ChantierRentabiliteResume {
  prixVenteHT: number;
  coutMateriauxPrevu: number;
  coutMateriauxReel: number;
  /** Tous achats chantier (toutes catégories). */
  achatsReelsHT: number;
  coutMainOeuvrePrevu: number;
  coutMainOeuvreReel: number;
  coutTotalPrevu: number;
  coutTotalReel: number;
  /** Achats réels + main-d'œuvre réelle pointée. */
  debourseReel: number;
  tempsPrevuHeures: number;
  tempsReelHeures: number;
  margePrevue: number;
  margeReelle: number;
  tauxMargeReelle: number;
  ecartTempsHeures: number;
  ecartCoutTotal: number;
  beneficeReel: number;
  fiabilite: PilotageFiabiliteNiveau;
  fiabiliteLabel: string;
  rentabiliteIncomplete: boolean;
}

export interface Devis {
  id: string;
  numero: string;
  clientId: string;
  titre: string;
  lignes: LigneDevis[];
  statut: StatutDevis;
  date: string;
  dateCreation?: string;
  dateDevis?: string;
  montantHT?: number;
  montantTTC?: number;
  tauxTVA?: number;
  signature?: string;
  nomSignataire?: string;
  dateSignature?: string;
  signedAt?: string;
  signedBy?: string;
  sentAt?: string;
  clientIp?: string;
  signatureId?: string;
  /** Relances email programmées / envoyées pour ce devis. */
  relancesProgrammees?: DevisRelanceEntry[];
  /** Désactive les relances automatiques pour ce devis. */
  relancesDesactivees?: boolean;
  /** Nombre total de relances envoyées. */
  relanceCount?: number;
  /** Date ISO de la dernière relance. */
  derniereRelanceAt?: string;
  historique?: DevisHistoriqueEntry[];
  refusedAt?: string;
  refusedBy?: string;
  refusalReason?: string;
  signedPdfBase64?: string;
  signedPdfGeneratedAt?: string;
  validiteJours: number;
  dateDebutTravauxEstimee?: string;
  typeChantier?: TypeChantier;
  typeChantierPersonnalise?: string;
  adresseChantier?: string;
  descriptionChantier?: string;
  notesInternes?: string;
  conditionsParticulieres?: string;
  delaisEstimes?: string;
  modalitesPaiement?: string;
  acompteDemande?: number;
  acompteDemandeMode?: "pourcentage" | "montant";
  /** Métadonnées internes MUM IA — jamais exposées au client. */
  mumIaMetadata?: MumIaDevisMetadata;
  /** Catégorie pilotage pour analyses de rentabilité. */
  categoriePilotage?: CategoriePilotageChantier;
  categoriePilotagePersonnalise?: string;
  /** Estimation main-d'œuvre (interne). */
  pilotageMainOeuvre?: DevisPilotageMainOeuvre;
}

export type CategorieAchatChantier =
  | "materiaux"
  | "main_oeuvre"
  | "location"
  | "sous_traitance"
  | "autre";

export interface AchatChantier {
  id: string;
  fournisseur: string;
  libelle: string;
  montantHT: number;
  tauxTVA: number;
  date: string;
  categorie: CategorieAchatChantier;
}

export interface Chantier {
  id: string;
  nom: string;
  clientId: string;
  adresse: string;
  statut: StatutChantier;
  type?: TypeChantier;
  typePersonnalise?: string;
  etapes?: EtapeChantier[];
  achats?: AchatChantier[];
  dateDebut: string;
  dateFin: string;
  budget: number;
  /** Devis d’origine (création chantier depuis devis). */
  devisId?: string;
  devisNumber?: string;
  sourceDevisTitle?: string;
  historique?: ChantierHistoriqueEntry[];
  /** Catégorie pilotage (héritée du devis ou saisie manuelle). */
  categoriePilotage?: CategoriePilotageChantier;
  categoriePilotagePersonnalise?: string;
  heuresPrevues?: number;
  tauxHoraireInterne?: number;
  employesPrevusIds?: string[];
}

export interface EtapeChantier {
  id: string;
  titre: string;
  fait: boolean;
  poids: number;
}

export type LigneFacture = LigneDevis;

export type TypeFacture = "classique" | "acompte" | "situation" | "solde";

export type AcompteMode = "montant" | "pourcentage";

export type SituationMode = "pourcentage" | "quantite" | "montant";

export type StatutCommande = "en_cours" | "terminee" | "annulee";

export interface Commande {
  id: string;
  numero: string;
  devisId: string;
  clientId: string;
  chantierId?: string;
  statut: StatutCommande;
  dateCreation: string;
  montantTTC: number;
  montantHT?: number;
  devisNumero?: string;
  devisTitre?: string;
  /** Avancement cumulé facturé par ligne de devis (0–100 %). */
  lignesSituation?: CommandeLigneSituation[];
  historique?: CommandeHistoriqueEntry[];
}

export type CommandeHistoriqueType =
  | "cree"
  | "modifie"
  | "facture_creee"
  | "terminee"
  | "annulee";

export interface CommandeHistoriqueEntry {
  id: string;
  type: CommandeHistoriqueType;
  label: string;
  date: string;
  meta?: Record<string, string>;
}

export interface CommandeLigneSituation {
  ligneDevisId: string;
  pourcentageFacture: number;
}

export interface FactureDeduction {
  factureId: string;
  numero: string;
  montant: number;
  typeFacture: TypeFacture;
}

export type FactureHistoriqueType =
  | "cree"
  | "envoyee"
  | "payee"
  | "relance"
  | "en_retard"
  | "transmission_electronique";

export type StatutTransmissionElectronique =
  | "non_transmis"
  | "en_attente"
  | "transmis"
  | "accepte"
  | "rejete"
  | "erreur";

export interface FactureTransmissionHistoriqueEntry {
  id: string;
  date: string;
  statut: StatutTransmissionElectronique;
  /** Identifiant technique de la transmission côté PDP. */
  pdpTransmissionId?: string;
  /** Fournisseur PDP (slug). */
  pdpProviderId?: string;
  message?: string;
  identifiantFactureElectronique?: string;
  meta?: Record<string, string>;
}

export interface FactureTransmissionElectronique {
  statut: StatutTransmissionElectronique;
  /** Fournisseur PDP (slug). */
  pdpProviderId?: string;
  /** Identifiant technique de transmission côté PDP. */
  pdpTransmissionId?: string;
  dateTransmission?: string;
  dateAcceptation?: string;
  dateRejet?: string;
  motifRejet?: string;
  identifiantFactureElectronique?: string;
  historique?: FactureTransmissionHistoriqueEntry[];
}

export interface FactureHistoriqueEntry {
  id: string;
  type: FactureHistoriqueType;
  label: string;
  date: string;
  meta?: Record<string, string>;
}

export type FactureRelanceNiveau =
  | "avant_echeance_3j"
  | "jour_echeance"
  | "apres_echeance_7j"
  | "apres_echeance_15j"
  | "apres_echeance_30j"
  | "manuelle";

export type DevisRelanceNiveau =
  | "j7"
  | "j14"
  | "j21"
  | "personnalise"
  | "manuelle";

export interface DevisRelanceEntry {
  id: string;
  regleId: string;
  niveau: DevisRelanceNiveau;
  date: string;
  canal: "email";
}

export interface DevisRelanceRegle {
  id: string;
  label: string;
  actif: boolean;
  joursApresEnvoi: number;
  sujet: string;
  message: string;
}

export interface FactureRelanceEntry {
  id: string;
  niveau: FactureRelanceNiveau;
  date: string;
  canal: "email";
}

export interface Facture {
  id: string;
  numero: string;
  clientId: string;
  chantierId?: string;
  typeFacture?: TypeFacture;
  /** Montant TTC (compatibilité liste / relances). */
  montant: number;
  montantHT?: number;
  montantTTC?: number;
  tauxTVA?: number;
  statut: StatutFacture;
  dateEmission: string;
  dateEcheance: string;
  datePaiement?: string;
  /** Lien vers le devis d’origine (transformation en un clic). */
  devisSourceId?: string;
  /** Devis lié (acompte / situation / solde). */
  devisLieId?: string;
  /** Chantier lié (acompte / situation / solde). */
  chantierLieId?: string;
  adresse?: string;
  descriptionChantier?: string;
  lignes?: LigneFacture[];
  /** Acompte : montant fixe ou % du total devis/chantier. */
  acompteMode?: AcompteMode;
  acompteValeur?: number;
  /** Situation : % d’avancement cumulé facturé. */
  pourcentageAvancement?: number;
  situationMode?: SituationMode;
  /** Situation par quantité : % cumulé des quantités facturées. */
  situationQuantitePourcentage?: number;
  /** Situation montant libre (TTC). */
  situationMontantLibre?: number;
  totalSituation?: number;
  /** Commande liée (facturation progressive). */
  commandeLieId?: string;
  /** Snapshots affichage (V1). */
  totalDevisTTC?: number;
  montantDejaFacture?: number;
  resteAFacturer?: number;
  resteAPayer?: number;
  totalAcomptesDeduits?: number;
  totalSituationsDeduits?: number;
  deductions?: FactureDeduction[];
  /** Cumul des avoirs émis sur cette facture (TTC). */
  montantAvoirTTC?: number;
  /** Statut conservé avant application d’un avoir. */
  statutOrigine?: StatutFacture;
  historique?: FactureHistoriqueEntry[];
  /** Désactive les relances automatiques pour cette facture. */
  relancesDesactivees?: boolean;
  /** Relances programmées / envoyées (suivi par palier). */
  relancesProgrammees?: FactureRelanceEntry[];
  /** Suivi facturation électronique (PDP / réforme 2026+). */
  transmissionElectronique?: FactureTransmissionElectronique;
}

export type AvoirMode = "total" | "partiel";

export interface Avoir {
  id: string;
  numero: string;
  factureId: string;
  factureNumero: string;
  clientId: string;
  mode: AvoirMode;
  montantHT: number;
  montantTTC: number;
  tauxTVA?: number;
  motif?: string;
  dateEmission: string;
}

export interface Employe {
  id: string;
  prenom: string;
  nom: string;
  photo?: string;
  poste?: string;
  /** Email de connexion (V1 locale — migration Supabase prévue). */
  email?: string;
  /** Identifiant alternatif si pas d'email. */
  identifiant?: string;
  telephone?: string;
  statut?: EmployeStatut;
  /** Code d'accès temporaire (affiché une fois à la génération). */
  accessCode?: string;
  accessCodeExpiresAt?: string;
  /** Couleur d'affichage dans le planning (hex ou nom). */
  couleurPlanning?: string;
  /** Coût horaire interne pour le calcul de rentabilité. */
  coutHoraireInterne?: number;
  /** Spécialité principale (usage interne pilotage). */
  specialitePrincipale?: string;
  /** Types de chantiers maîtrisés / préférés (usage interne). */
  typesChantiersMaitrises?: CategoriePilotageChantier[];
}

export type EmployeStatut = "actif" | "desactive";

export interface PlanningEmployeSignalement {
  id: string;
  employeId: string;
  message: string;
  dateCreation: string;
}

export type TypeEvenementPlanning =
  | "intervention"
  | "deplacement"
  | "rendez_vous_client"
  | "livraison_materiaux"
  | "reunion_chantier"
  | "sav"
  | "autre"
  | "reunion"
  | "livraison";

export interface EvenementPlanning {
  id: string;
  /** Libellé affiché (rétrocompatibilité dashboard / rappels). */
  titre: string;
  /** Tâche saisie par l'utilisateur (optionnelle si chantier lié). */
  tache?: string;
  chantierId?: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  type: TypeEvenementPlanning;
  typePersonnalise?: string;
  /** Employés assignés à l'événement. */
  employeIds?: string[];
  /** Employés ayant marqué la tâche comme terminée. */
  employeTermineIds?: string[];
  /** Employés ayant marqué la tâche en cours. */
  employeEnCoursIds?: string[];
  /** Signalements envoyés par les employés. */
  employeProblemes?: PlanningEmployeSignalement[];
  /** Lien vers une affectation chantier sur période (série d'événements). */
  affectationId?: string;
}

/** Affectation d'employé(s) à un chantier sur une période (génère le planning). */
export interface ChantierAffectation {
  id: string;
  chantierId: string;
  employeIds: string[];
  dateDebut: string;
  dateFin: string;
  /** 1 = lundi … 6 = samedi, 7 = dimanche (convention getDay JS sauf dimanche = 7). */
  joursSemaine: number[];
  heureDebut: string;
  heureFin: string;
  note?: string;
}

export interface NotificationApp {
  id: string;
  planningId?: string;
  relanceId?: string;
  titre: string;
  message: string;
  dateCreation: string;
  lue: boolean;
  rappelMinutes?: 10 | 30;
  type?: "planning" | "relance";
}

export interface RelanceClient {
  id: string;
  documentType: "devis" | "facture";
  documentId: string;
  numero: string;
  dateRelance: string;
  typeRelance: "automatique" | "manuelle";
  statut: "preparee" | "envoyee" | "envoyee_simulee";
  message: string;
  niveauRelance?: FactureRelanceNiveau;
  niveauRelanceDevis?: DevisRelanceNiveau;
  regleRelanceId?: string;
}

export type ModeTVA = "classique" | "non_applicable_293B";

export type PdpConnexionStatut =
  | "non_configure"
  | "test_ok"
  | "test_erreur"
  | "production_ok"
  | "production_erreur";

export type PdpEnvironnement = "test" | "production";

export interface ParametresFacturationElectronique {
  /** Slug du fournisseur PDP (ex. chorus-pro). */
  pdpProviderId?: string;
  /** Clé API PDP — stockée localement (préparation intégration). */
  pdpApiKey?: string;
  /** Dernier résultat de test de connexion. */
  pdpConnexionStatut?: PdpConnexionStatut;
  /** Environnement cible des transmissions. */
  pdpEnvironnement?: PdpEnvironnement;
  /** Horodatage ISO du dernier test de connexion. */
  pdpDernierTestLe?: string;
  /** Message technique du dernier test (sans exposer la clé). */
  pdpDernierTestMessage?: string;
}

export type FournisseurFamilleProduit =
  | "plomberie"
  | "carrelage"
  | "placo"
  | "peinture"
  | "electricite"
  | "chauffage"
  | "climatisation"
  | "menuiserie"
  | "autre";

export interface FournisseurRemiseFamille {
  famille: FournisseurFamilleProduit;
  remisePourcent: number;
}

export interface FournisseurTarifLigne {
  id: string;
  fournisseurId: string;
  reference?: string;
  nomProduit: string;
  categorie?: string;
  unite?: string;
  /** Conditionnement (ex. carton de 10, palette…). */
  conditionnement?: string;
  commentaire?: string;
  prixPublic?: number;
  prixRemise?: number;
  prixEntrepriseSaisi?: number;
  /** TVA applicable (%) */
  tauxTVA?: number;
  /** Prix achat TTC (calculé ou saisi) */
  prixAchatTTC?: number;
  /** Prix vente HT conseillé */
  prixVenteHT?: number;
  /** Prix vente TTC conseillé */
  prixVenteTTC?: number;
  dateImport: string;
  sourceImport: "pdf" | "excel" | "csv" | "manuel" | "ia";
  /** Nom du fichier d'import d'origine. */
  fichierImport?: string;
  aVerifier?: boolean;
}

export interface Fournisseur {
  id: string;
  /** Identifiant entreprise (isolation multi-comptes). */
  companyId?: string;
  nom: string;
  /** Enseigne commerciale (ex. Point.P). */
  enseigne?: string;
  /** Nom exact du dépôt sélectionné. */
  nomDepot?: string;
  /** Identifiant OpenStreetMap (ex. node/123, way/456). */
  osmId?: string;
  osmType?: "node" | "way" | "relation";
  /** Identifiant Google Places ou legacy OSM (placeId). */
  placeId?: string;
  adresseDepot: string;
  ville: string;
  codePostal: string;
  latitude?: number;
  longitude?: number;
  /** Distance estimée depuis l'entreprise (km). */
  distanceKm?: number;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  /** Origine du téléphone (openstreetmap, données publiques, manuel…). */
  phoneSource?: "openstreetmap" | "entreprise_public_data" | "manual" | "unavailable";
  /** Origine du site web. */
  websiteSource?: "openstreetmap" | "entreprise_public_data" | "manual" | "unavailable";
  /** Téléphone confirmé / modifié par l'utilisateur. */
  phoneVerified?: boolean;
  /** Site web confirmé / modifié par l'utilisateur. */
  websiteVerified?: boolean;
  /** Date ISO d'ajout du fournisseur. */
  dateAjout?: string;
  /** Date ISO de création. */
  createdAt?: string;
  /** Date ISO de dernière modification. */
  updatedAt?: string;
  /** Origine de la fiche : OpenStreetMap, Annuaire des Entreprises ou saisie manuelle. */
  source?: "places" | "manual" | "osm" | "openstreetmap" | "annuaire_entreprises";
  /** @deprecated Plus utilisé — prix réels par ligne */
  remiseGlobalePourcent?: number;
  /** @deprecated Plus utilisé */
  familles: FournisseurFamilleProduit[];
  /** @deprecated Plus utilisé */
  remisesParFamille?: FournisseurRemiseFamille[];
  favori?: boolean;
  commentaireInterne?: string;
  /** Date ISO de dernière mise à jour tarifaire. */
  dateDerniereMiseAJour?: string;
  /** Actif = utilisable ; Archivé = conservé mais hors sélections / MUM IA. */
  status?: "active" | "archived";
}

export type EntreprisePriceType = "material" | "labor" | "service" | "equipment";

export type EntreprisePriceSource =
  | "manual"
  | "import_pdf"
  | "import_excel"
  | "import_csv"
  | "public_price"
  | "mum_ai"
  | "history"
  | "appris";

export type EntreprisePriceReliability =
  | "verified"
  | "imported"
  | "history"
  | "public"
  | "estimated"
  | "to_verify";

export type SalePriceMode = "coefficient" | "manual";

export interface EntreprisePriceLibraryEntry {
  id: string;
  companyId: string;
  type: EntreprisePriceType;
  name: string;
  /** Référence fournisseur / catalogue. */
  reference?: string;
  description?: string;
  category?: string;
  trade?: string;
  unit: string;
  supplierId?: string;
  supplierName?: string;
  purchasePriceHT?: number;
  salePriceHT?: number;
  marginRate?: number;
  markupCoefficient?: number;
  vatRate?: number;
  source: EntreprisePriceSource;
  confidence: number;
  lastUpdatedAt: string;
  isVerified: boolean;
  isFavorite: boolean;
  notes?: string;
  normaliseKey?: string;
  desactive?: boolean;
  salePriceMode?: SalePriceMode;
}

export interface EntreprisePriceLibrary {
  entries: EntreprisePriceLibraryEntry[];
  defaultMarkupCoefficient?: number;
  defaultSalePriceMode?: SalePriceMode;
  /** MUM IA privilégie le meilleur prix achat vérifié entre fournisseurs. */
  useBestPriceInMumIA?: boolean;
}

export interface Parametres {
  entreprise: string;
  siret: string;
  /** 9 premiers chiffres du SIRET (facturation électronique). */
  siren?: string;
  formeJuridique?: string;
  codeApe?: string;
  capitalSocial?: string;
  adresse: string;
  ville?: string;
  codePostal?: string;
  departement?: string;
  region?: string;
  pays?: string;
  siteInternet?: string;
  email: string;
  /** Email dédié à l'envoi des factures (sinon email principal). */
  emailFacturation?: string;
  telephone: string;
  tva: number;
  tvaIntracom?: string;
  modeTVA?: ModeTVA;
  conditionsReglement?: string;
  conditionsGenerales?: string;
  coordonneesBancaires?: string;
  coordonneesBancairesTitulaire?: string;
  coordonneesBancairesBanque?: string;
  coordonneesBancairesIban?: string;
  coordonneesBancairesBic?: string;
  afficherCoordonneesBancaires?: boolean;
  acompte?: string;
  penalitesRetard?: string;
  indemniteForfaitaire?: string;
  tribunalCompetent?: string;
  utilisateur: string;
  /** @deprecated Conservé pour compatibilité — préférer logoApplication / logoPdf */
  logoEntreprise?: string;
  logoApplication?: string;
  logoPdf?: string;
  theme?: "light";
  objectifCaMensuel?: number;
  /** Taux horaire interne par défaut (€/h) pour la rentabilité si non renseigné par employé. */
  tauxHoraireInterneDefaut?: number;
  assuranceDecennale?: boolean;
  nomAssurance?: string;
  numeroPoliceAssurance?: string;
  prefixeDevis?: string;
  prefixeFacture?: string;
  prefixeAvoir?: string;
  prefixeCommande?: string;
  anneeAutomatique?: boolean;
  compteurDevis?: number;
  compteurFacture?: number;
  compteurAvoir?: number;
  compteurCommande?: number;
  signatureEmail?: string;
  signaturePdf?: string;
  /** Plateforme de dématérialisation / PDP choisie (préparation 2026/2027). */
  plateformeDematerialisation?: string;
  /** Configuration facturation électronique (PDP). */
  facturationElectronique?: ParametresFacturationElectronique;
  /** Entreprise prête pour la facturation électronique (contrôle des mentions). */
  eFacturationPrete?: boolean;
  /** Active les relances email automatiques sur les factures impayées. */
  relancesAutomatiques?: boolean;
  relanceAvantEcheance3j?: boolean;
  relanceJourEcheance?: boolean;
  relanceJ7?: boolean;
  relanceJ15?: boolean;
  relanceJ30?: boolean;
  /** Active les relances email automatiques sur les devis envoyés. */
  relancesDevisAutomatiques?: boolean;
  /** Règles de relance devis (J+7, J+14, J+21, personnalisées). */
  relancesDevis?: DevisRelanceRegle[];
  /** Générations IA consommées ce mois. */
  aiGenerationsUsed?: number;
  /** Mois courant du compteur IA (YYYY-MM). */
  aiGenerationsMonth?: string;
  /** Limite mensuelle IA (sinon selon abonnement). */
  aiGenerationsLimit?: number;
  /** Crédits IA bonus achetés (packs supplémentaires). */
  aiPackCredits?: number;
  /** Couleur principale des devis PDF / aperçu. */
  couleurDevis?: DevisBrandColorId;
  /** Hex personnalisé si couleurDevis = personnalise. */
  couleurDevisCustom?: string;
  /** Métadonnées connexion email OAuth (tokens côté serveur uniquement). */
  connexionEmail?: ParametresConnexionEmail;
  /** Fournisseurs configurés pour le copilote achats. */
  fournisseurs?: Fournisseur[];
  /** Bibliothèque tarifaire (import PDF/Excel/CSV ou saisie manuelle). */
  tarifsFournisseurs?: FournisseurTarifLigne[];
  /** Bibliothèque prix unifiée entreprise (achat + vente). */
  entreprisePriceLibrary?: EntreprisePriceLibrary;
}

import type { DevisBrandColorId } from "@/lib/devis-brand-colors";

export type EmailOAuthProvider = "google" | "microsoft";

export type ConnexionEmailStatut = "connecte" | "non_connecte" | "expire";

export interface ParametresConnexionEmail {
  provider?: EmailOAuthProvider | null;
  connectedEmail?: string;
  statut: ConnexionEmailStatut;
  connecteLe?: string;
  expireLe?: string;
}

export type BibliothequeSource = "appris" | "manuel";

export type AiPrixSource = "manuel" | "appris" | "regional" | "batimum" | "a_verifier";

export type RatioType =
  | "sdb_surface_faiencage"
  | "sdb_surface_spots"
  | "sdb_plomberie_ml"
  | "cuisine_credence_ml"
  | "logement_peinture_m2"
  | "logement_prises"
  | "logement_interrupteurs"
  | "maison_besoins";

export interface BibliothequeRatioEntry {
  id: string;
  ratioType: RatioType;
  label: string;
  valeurMoyenne: number;
  valeurMin: number;
  valeurMax: number;
  uniteSource: string;
  uniteCible: string;
  nombreObservations: number;
  fiabilite: number;
  source: "standard" | "appris";
  valeursObservees?: number[];
}

export interface MumIaLigneInterne {
  designation: string;
  section?: string;
  sourcePrix?: AiPrixSource;
  fiabilitePrix?: number;
  quantiteEstimee?: boolean;
  ratioApplique?: string;
  conversionUniteNote?: string;
}

export interface MumIaConfianceDetail {
  prixEntrepriseConnus: number;
  prixRegionaux: number;
  prixAVerifier: number;
  quantitesEstimees: number;
  ratiosAppliques: number;
  lignesTotal: number;
}

export interface MumIaDevisMetadata {
  scoreConfiance?: number;
  detailConfiance?: MumIaConfianceDetail;
  hypothesesUtilisees?: string[];
  rapportVerification?: import("@/lib/ai-devis-verification").AiDevisVerificationReport;
  autoVerification?: import("@/lib/ai-devis").AiDevisAutoVerification;
  pointsAVerifier?: string[];
  lignesInternes?: MumIaLigneInterne[];
  genereLe?: string;
}

export interface BibliothequeEntrepriseEntry {
  id: string;
  categorie: string;
  designation: string;
  unite: string;
  prixMoyenHT: number;
  prixMinHT: number;
  prixMaxHT: number;
  tauxTVA?: number;
  nombreUtilisations: number;
  derniereUtilisation: string;
  source: BibliothequeSource;
  /** Score 0–100 selon source et historique d'utilisation. */
  fiabilite?: number;
  /** Prix manuel verrouillé — l'apprentissage ne l'écrase pas. */
  verrouille?: boolean;
  /** Ligne masquée (suppression douce). */
  desactive?: boolean;
  regionLabel?: string;
  departementCode?: string;
  /** Clé de correspondance normalisée. */
  normaliseKey: string;
  /** Historique interne des prix observés (apprentissage). */
  prixObserves?: number[];
}

export interface BibliothequeEntreprise {
  entries: BibliothequeEntrepriseEntry[];
  apprentissageAutomatique: boolean;
  /** Apprendre depuis les devis envoyés. */
  apprendreDepuisEnvoye?: boolean;
  /** Apprendre depuis les devis signés. */
  apprendreDepuisSigne?: boolean;
  /** Département principal de l'entreprise (ex. 81). */
  departementPrincipal?: string;
  regionPrincipale?: string;
  /** Surcharge manuelle du coefficient régional (null = automatique). */
  coefficientRegionalManuel?: number | null;
  /** Devis déjà traités — évite double apprentissage. */
  learnedDevis: Record<string, "envoye" | "signe">;
  /** Ratios métier appris (quantités habituelles). */
  ratios?: BibliothequeRatioEntry[];
}

export type MumIaHistoriqueStatut = "analyse" | "genere" | "transforme" | "supprime";

export interface MumIaHistoriqueEntry {
  id: string;
  createdAt: string;
  titre: string;
  descriptionChantier: string;
  /** Précisions libres ajoutées avant génération. */
  precisionsSupplementaires?: string;
  regionCode: string;
  regionLabel: string;
  departementCode: string;
  departementLabel: string;
  villeEntreprise?: string;
  typeChantier: TypeChantier;
  niveauPrix: import("@/lib/btp-tarifs-reference").BtpNiveauPrix;
  tauxTVA: number;
  totalHT: number;
  totalTTC?: number;
  statut: MumIaHistoriqueStatut;
  devisBrouillonId?: string;
  /** Absent tant que le devis n'est pas généré (statut analyse). */
  devisIa?: import("@/lib/ai-devis").AiDevisResult;
  /** Snapshot de l'analyse pour reprise depuis l'historique. */
  analysisSnapshot?: import("@/lib/ai-devis-analysis").AiChantierAnalysis;
}

export interface AppData {
  clients: Client[];
  devis: Devis[];
  chantiers: Chantier[];
  commandes: Commande[];
  factures: Facture[];
  avoirs: Avoir[];
  employes: Employe[];
  planning: EvenementPlanning[];
  affectations: ChantierAffectation[];
  notifications: NotificationApp[];
  deletedNotificationKeys: string[];
  relances: RelanceClient[];
  parametres: Parametres;
  bibliothequeEntreprise: BibliothequeEntreprise;
  /** Historique des générations MUM IA */
  mumIaHistorique?: MumIaHistoriqueEntry[];
  /** Pointages heures par chantier. */
  chantierTimeEntries?: ChantierTimeEntry[];
}

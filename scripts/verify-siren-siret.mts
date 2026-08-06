/**
 * Vérifications SIREN/SIRET + lookup Annuaire (sans framework de test).
 * Usage : node --experimental-strip-types scripts/verify-siren-siret.mts
 */
import {
  computeFrenchTvaIntracomFromSiren,
  formatSirenSiretDisplay,
  normalizeSirenSiretInput,
  passesLuhn,
  validateSirenSiretInput,
} from "../lib/entreprise/siren-siret.ts";

const ANNUAIRE = "https://recherche-entreprises.api.gouv.fr/search";

let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${label}`);
  }
}

async function search(q: string) {
  const url = new URL(ANNUAIRE);
  url.searchParams.set("q", q);
  url.searchParams.set("per_page", "5");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<{
    results?: Array<{
      siren?: string;
      nom_complet?: string;
      etat_administratif?: string;
      nombre_etablissements_ouverts?: number;
      siege?: { siret?: string; est_siege?: boolean; etat_administratif?: string };
      matching_etablissements?: Array<{
        siret?: string;
        est_siege?: boolean;
        etat_administratif?: string;
      }>;
    }>;
  }>;
}

console.log("1. Normalisation & validation");
assert(normalizeSirenSiretInput("123 456 789") === "123456789", "espaces retirés");
assert(normalizeSirenSiretInput("123-456.789") === "123456789", "non-digits retirés");
assert(validateSirenSiretInput("552081317").ok === true, "SIREN EDF valide");
assert(validateSirenSiretInput("552 081 317").ok === true, "SIREN avec espaces");
assert(validateSirenSiretInput("55208131766522").ok === true, "SIRET EDF siège valide");
assert(validateSirenSiretInput("123456789").ok === false, "SIREN Luhn invalide");
{
  const r = validateSirenSiretInput("123456789");
  assert(!r.ok && r.error.includes("SIREN"), "message SIREN invalide");
}
{
  const r = validateSirenSiretInput("12345678");
  assert(!r.ok && r.error.includes("9"), "message longueur SIREN");
}
{
  const r = validateSirenSiretInput("123456789012");
  assert(!r.ok && r.error.includes("14"), "message longueur SIRET");
}
assert(passesLuhn("356000000"), "La Poste SIREN Luhn");
assert(formatSirenSiretDisplay("552081317") === "552 081 317", "format affichage SIREN");
assert(
  computeFrenchTvaIntracomFromSiren("552081317") === "FR03552081317",
  "TVA EDF depuis SIREN",
);
assert(
  computeFrenchTvaIntracomFromSiren("55208131766522") === "FR03552081317",
  "TVA EDF depuis SIRET",
);

console.log("\n2. API Recherche d'entreprises (officielle, sans clé)");
const sirenData = await search("552081317");
const edf = sirenData.results?.find((r) => r.siren === "552081317");
assert(Boolean(edf), "SIREN EDF trouvé");
assert(Boolean(edf?.nom_complet), "raison sociale");
assert(Boolean(edf?.siege?.siret), "siège présent");
assert(
  (edf?.nombre_etablissements_ouverts ?? 0) > 1,
  "plusieurs établissements (EDF)",
);

const siretData = await search("55208131766522");
const edfSiret = siretData.results?.find((r) => r.siren === "552081317");
assert(Boolean(edfSiret), "SIRET siège EDF trouvé");
const matchSiege = (edfSiret?.matching_etablissements ?? []).find(
  (e) => e.siret === "55208131766522",
);
assert(Boolean(matchSiege?.est_siege), "matching siège");

const secondaryData = await search("55208131703053");
const secondary = (secondaryData.results?.[0]?.matching_etablissements ?? []).find(
  (e) => e.siret === "55208131703053",
);
assert(Boolean(secondary), "établissement secondaire trouvé");
assert(secondary?.est_siege === false, "secondaire non siège");

const closedData = await search("344223383");
assert(closedData.results?.[0]?.etat_administratif === "C", "entreprise fermée");

assert(validateSirenSiretInput("123456789").ok === false, "invalide bloqué avant API");

console.log("\n3. Sécurité");
assert(!ANNUAIRE.includes("apikey"), "URL sans clé");
assert(ANNUAIRE.startsWith("https://recherche-entreprises.api.gouv.fr"), "endpoint officiel");

if (failed > 0) {
  console.error(`\n${failed} échec(s)`);
  process.exit(1);
}
console.log("\nTous les tests sont passés.");

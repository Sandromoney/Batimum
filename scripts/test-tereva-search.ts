/**
 * Test Téréva autour d'Albi — exécuter avec :
 * npx tsx scripts/test-tereva-search.ts
 */
import { searchSuppliers } from "../lib/maps/supplier-search-orchestrator";

const ALBI_LAT = 43.9298;
const ALBI_LON = 2.148;
const RADIUS_KM = 15;

const QUERIES = ["Téréva", "tereva", "TEREVA", "téréva", "tereva albi"];

async function main() {
  console.log("=== Test recherche Téréva — Albi (15 km) ===\n");

  for (const query of QUERIES) {
    console.log(`--- Requête: "${query}" ---`);
    const outcome = await searchSuppliers({
      query,
      latitude: ALBI_LAT,
      longitude: ALBI_LON,
      radiusKm: RADIUS_KM,
      ville: "Albi",
      codePostal: "81000",
    });

    console.log("Passes essayées:", outcome.debug.passesTried.length);
    console.log("Sources:", outcome.debug.sourcesUsed.join(", ") || "aucune");
    console.log("Avant dédup:", outcome.debug.rawCountBeforeDedup);
    console.log("Après dédup:", outcome.debug.countAfterDedup);

    if (outcome.results.length > 0) {
      const first = outcome.results[0];
      console.log("Premier résultat:");
      console.log("  Nom:", first.name);
      console.log("  Adresse:", first.address);
      console.log("  Ville:", first.city, first.postcode);
      console.log("  Distance:", first.distanceKm.toFixed(2), "km");
      console.log("  Source:", first.source);
      console.log("  ID:", first.id);
    } else {
      console.log("Aucun résultat.");
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

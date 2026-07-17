/**
 * Test contacts fournisseurs autour d'Albi.
 * npx tsx scripts/test-supplier-contacts.ts
 */
import { searchSuppliers } from "../lib/maps/supplier-search-orchestrator";

const ALBI_LAT = 43.9298;
const ALBI_LON = 2.148;
const RADIUS_KM = 15;

const QUERIES = ["CEDEO", "Point.P", "Téréva", "Partedis"];

async function main() {
  console.log("=== Test contacts fournisseurs — Albi (15 km) ===\n");

  for (const query of QUERIES) {
    console.log(`--- ${query} ---`);
    const outcome = await searchSuppliers({
      query,
      latitude: ALBI_LAT,
      longitude: ALBI_LON,
      radiusKm: RADIUS_KM,
      ville: "Albi",
      codePostal: "81000",
    });

    console.log(`Résultats: ${outcome.results.length}`);
    console.log(`Sources: ${outcome.debug.sourcesUsed.join(", ") || "aucune"}`);

    for (const item of outcome.results.slice(0, 3)) {
      console.log(`  • ${item.name}`);
      console.log(`    Adresse: ${item.address}, ${item.postcode} ${item.city}`);
      console.log(`    Distance: ${item.distanceKm.toFixed(2)} km`);
      console.log(
        `    Téléphone: ${item.phone ?? "NON"} | source=${item.phoneSource ?? "unavailable"}`,
      );
      console.log(
        `    Site: ${item.website ?? "NON"} | source=${item.websiteSource ?? "unavailable"}`,
      );
      console.log(`    Source dépôt: ${item.source}`);
    }
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

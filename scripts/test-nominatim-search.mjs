/**
 * Test Nominatim supplier search.
 * Usage: NODE_ENV=development npx tsx scripts/test-nominatim-search.mjs
 */
import { searchSuppliersNominatim } from "../lib/maps/search-suppliers-nominatim.ts";

const LAT = 43.9298;
const LON = 2.148;
const RADIUS = 60;

async function run(label, query) {
  console.log("\n==========", label, "==========");
  try {
    const outcome = await searchSuppliersNominatim({
      query,
      latitude: LAT,
      longitude: LON,
      radiusKm: RADIUS,
    });
    console.log("source:", outcome.source);
    console.log("rawCount:", outcome.rawCount);
    console.log("results:", outcome.results.length);
    console.log("first:", outcome.results[0] ?? null);
    if (outcome.results[0]) {
      console.log("distanceKm:", outcome.results[0].distanceKm);
    }
    return outcome;
  } catch (error) {
    console.error("FAILED:", error);
    return null;
  }
}

await run("CEDEO", "CEDEO");
await run("Point.P", "Point.P");

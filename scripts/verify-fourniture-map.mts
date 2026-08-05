/**
 * Vérifications légères carte fournisseurs (jitter / groupement / coords).
 * node --experimental-strip-types scripts/verify-fourniture-map.mts
 */
import assert from "node:assert/strict";
import {
  groupNearbyPoints,
  jitterLatLng,
  toSavedFournisseurMapPoint,
  type SavedFournisseurMapPoint,
} from "../lib/fourniture/map-points.ts";
import type { Fournisseur } from "../lib/types.ts";

function baseFournisseur(partial: Partial<Fournisseur>): Fournisseur {
  return {
    id: "f1",
    nom: "Test",
    enseigne: "Test",
    adresseDepot: "10 rue de la Paix",
    ville: "Paris",
    codePostal: "75002",
    familles: [],
    status: "active",
    source: "manual",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const [jLat] = jitterLatLng(48.87, 2.33, "abc", 0);
assert.notEqual(jLat, 48.87);
assert.ok(Math.abs(jLat - 48.87) < 0.001);

const points: SavedFournisseurMapPoint[] = [
  {
    id: "a",
    nom: "A",
    adresse: "x",
    ville: "Paris",
    codePostal: "75001",
    latitude: 48.87,
    longitude: 2.33,
  },
  {
    id: "b",
    nom: "B",
    adresse: "y",
    ville: "Paris",
    codePostal: "75001",
    latitude: 48.87005,
    longitude: 2.33005,
  },
  {
    id: "c",
    nom: "C",
    adresse: "z",
    ville: "Lyon",
    codePostal: "69001",
    latitude: 45.75,
    longitude: 4.85,
  },
];

const groups = groupNearbyPoints(points);
assert.equal(groups.length, 2);
assert.equal(groups.find((g) => g.length === 2)?.length, 2);

const mapped = toSavedFournisseurMapPoint(
  baseFournisseur({ latitude: 48.87, longitude: 2.33 }),
);
assert.ok(mapped);
assert.equal(mapped?.ville, "Paris");
assert.equal(mapped?.categorie, "Manuel");

const withoutCoords = toSavedFournisseurMapPoint(baseFournisseur({}));
assert.equal(withoutCoords, null);

console.log("verify-fourniture-map: ok");

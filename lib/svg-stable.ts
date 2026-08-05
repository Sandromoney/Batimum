/**
 * Coordonnées SVG / transforms stables SSR ↔ client.
 * Les flottants trigonométriques se sérialisent autrement sous Node et dans le navigateur
 * (ex. 141.1102725426582 vs 141.11027254265818) → mismatch d’hydratation.
 */

export function svgNum(n: number, digits = 3): number {
  const f = 10 ** digits;
  // Avoid -0
  const v = Math.round(n * f) / f;
  return Object.is(v, -0) ? 0 : v;
}

export function svgPair(x: number, y: number, digits = 3): string {
  return `${svgNum(x, digits)},${svgNum(y, digits)}`;
}

/** Hexagone pointy-top (angles 0°, 60°, …) — chaîne `points` déterministe. */
export function hexPoints(cx: number, cy: number, r: number, digits = 3): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (i * 60);
    return svgPair(cx + Math.cos(a) * r, cy + Math.sin(a) * r, digits);
  }).join(" ");
}

export function polarPoint(
  cx: number,
  cy: number,
  angleDeg: number,
  radius: number,
  digits = 3,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: svgNum(cx + Math.cos(rad) * radius, digits),
    y: svgNum(cy + Math.sin(rad) * radius, digits),
  };
}

export function pointsFromPairs(
  pairs: ReadonlyArray<readonly [number, number]>,
  digits = 3,
): string {
  return pairs.map(([x, y]) => svgPair(x, y, digits)).join(" ");
}

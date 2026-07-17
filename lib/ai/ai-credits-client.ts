/**
 * Helpers crédits IA côté client (sans imports serveur).
 */

export function getAiUsagePercentage(used: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

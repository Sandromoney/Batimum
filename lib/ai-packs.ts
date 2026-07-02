export type AiPackOption = {
  id: string;
  label: string;
  credits: number;
  priceEur: number;
  description: string;
};

export const AI_PACK_OPTIONS: AiPackOption[] = [
  {
    id: "pack_50",
    label: "Pack 50 demandes",
    credits: 50,
    priceEur: 9,
    description: "50 demandes IA supplémentaires",
  },
  {
    id: "pack_100",
    label: "Pack 100 demandes",
    credits: 100,
    priceEur: 15,
    description: "100 demandes IA supplémentaires",
  },
  {
    id: "pack_250",
    label: "Pack 250 demandes",
    credits: 250,
    priceEur: 29,
    description: "250 demandes IA supplémentaires",
  },
];

export function resolveAiPackById(packId: string): AiPackOption | undefined {
  return AI_PACK_OPTIONS.find((pack) => pack.id === packId);
}

export function computeAiQuotaTotal(
  includedLimit: number,
  bonusCredits = 0,
): number {
  return Math.max(0, includedLimit) + Math.max(0, bonusCredits);
}

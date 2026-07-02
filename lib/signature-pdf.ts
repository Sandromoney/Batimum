/** Dimensions de la signature dirigeant sur les PDF devis (mm). */
export const DIRIGEANT_SIGNATURE_PDF_MM = {
  width: 50,
  height: 18,
} as const;

/** Zone de dessin à l'écran — même ratio que le PDF (50 × 18 mm). */
export const DIRIGEANT_SIGNATURE_CANVAS = {
  widthPx: 275,
  heightPx: 99,
  guideInsetPx: 10,
} as const;

import type { Parametres } from "@/lib/types";

export type LogoPdfFitMode = "contain" | "cover";

export type LogoFitMode = LogoPdfFitMode;

export type LogoBoxFit = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function normalizeLogoFitMode(value?: string | null): LogoFitMode {
  return value === "cover" ? "cover" : "contain";
}

export function getLogoPdfFitMode(parametres: Parametres): LogoFitMode {
  return normalizeLogoFitMode(
    (parametres as Parametres & { logoPdfFitMode?: string }).logoPdfFitMode,
  );
}

export function logoFitClassName(mode: LogoFitMode): string {
  return mode === "cover"
    ? "object-cover object-center"
    : "object-contain object-center";
}

export function computeLogoBoxFit(
  boxWidth: number,
  boxHeight: number,
  imageWidth: number,
  imageHeight: number,
  mode: LogoFitMode,
): LogoBoxFit {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return { x: 0, y: 0, width: boxWidth, height: boxHeight };
  }

  const scale =
    mode === "cover"
      ? Math.max(boxWidth / imageWidth, boxHeight / imageHeight)
      : Math.min(boxWidth / imageWidth, boxHeight / imageHeight);

  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
    width,
    height,
  };
}

export async function optimizeLogoDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Impossible de traiter l'image.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  if (file.type === "image/png") {
    return canvas.toDataURL("image/png");
  }
  return canvas.toDataURL("image/jpeg", 0.92);
}

type JsPdfLike = {
  getImageProperties: (imageData: string) => {
    width: number;
    height: number;
    fileType: string;
  };
  addImage: (
    imageData: string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  saveGraphicsState: () => void;
  restoreGraphicsState: () => void;
  rect: (x: number, y: number, w: number, h: number) => void;
  clip: () => void;
};

export function addFittedImageToPdf(
  doc: JsPdfLike,
  imageData: string,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
  mode: LogoFitMode,
): boolean {
  try {
    const props = doc.getImageProperties(imageData);
    const fit = computeLogoBoxFit(
      boxWidth,
      boxHeight,
      props.width,
      props.height,
      mode,
    );

    if (mode === "cover") {
      doc.saveGraphicsState();
      doc.rect(boxX, boxY, boxWidth, boxHeight);
      doc.clip();
    }

    doc.addImage(
      imageData,
      props.fileType,
      boxX + fit.x,
      boxY + fit.y,
      fit.width,
      fit.height,
    );

    if (mode === "cover") {
      doc.restoreGraphicsState();
    }

    return true;
  } catch {
    return false;
  }
}

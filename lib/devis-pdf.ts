import { devisTotal } from "@/lib/data";
import { getClientAddress, getClientDisplayName } from "@/lib/clients";
import {
  computeDevisTvaRecap,
  formatTvaLigneLabel,
  ligneMontantHT,
  ligneMontantTTC,
  resolveLigneDefaultTva,
} from "@/lib/devis-tva";
import { buildDevisPdfFooterMentions } from "@/lib/devis-pdf-mentions";
import {
  getLignePdfDescription,
  getLigneDesignation,
  isEmptyLigneDevis,
  isSectionLigne,
  splitDevisPdfDescription,
} from "@/lib/devis-lignes";
import {
  formatSectionSubtotalLabel,
  getSectionSubtotalsAfterIndex,
} from "@/lib/devis-sections";
import { DEVIS_STATUT_LABELS } from "@/lib/devis";
import {
  formatAdresseEntreprise,
  getEffectiveTauxTVA,
  getLogoPdf,
  isTvaClassique,
} from "@/lib/parametres";
import { getClientFacingDevis } from "@/lib/mum-ia-mode";
import { resolveDevisBrandColor } from "@/lib/devis-brand-colors";
import type { Client, Devis, Parametres } from "@/lib/types";
import { loadSignedDevisPdf } from "@/lib/store";
import { formatDate, formatDateTimeFR } from "@/lib/utils";
import type { jsPDF } from "jspdf";

export type BuildDevisPdfOptions = {
  devis: Devis;
  client?: Client;
  parametres: Parametres;
  totalHT?: number;
};

function formatPdfCurrency(amount: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")} €`;
}

function getPdfLignes(devis: Devis) {
  const nonEmpty = devis.lignes.filter((ligne) => !isEmptyLigneDevis(ligne));
  return nonEmpty.length > 0 ? nonEmpty : devis.lignes;
}

export async function buildDevisPdfDoc({
  devis: rawDevis,
  client,
  parametres,
  totalHT,
}: BuildDevisPdfOptions): Promise<jsPDF> {
  const devis = getClientFacingDevis(rawDevis);
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const brandColor = resolveDevisBrandColor(parametres);
  let y = 14;

  const addText = (
    text: string,
    x: number,
    currentY: number,
    options: {
      size?: number;
      style?: "normal" | "bold";
      color?: [number, number, number];
      maxWidth?: number;
    } = {},
  ) => {
    doc.setFont("helvetica", options.style ?? "normal");
    doc.setFontSize(options.size ?? 10);
    doc.setTextColor(...(options.color ?? [20, 20, 20]));
    const lines = doc.splitTextToSize(text, options.maxWidth ?? pageWidth - margin * 2);
    doc.text(lines, x, currentY);
    return currentY + lines.length * ((options.size ?? 10) * 0.34 + 1.2);
  };

  const addSectionTitle = (title: string) => {
    y += 4;
    doc.setDrawColor(...brandColor.rgb);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    y = addText(title, margin, y, {
      size: 10,
      style: "bold",
      color: brandColor.rgb,
    });
  };

  const tvaRecap = computeDevisTvaRecap(devis, parametres.tva ?? 20);
  const total = totalHT ?? tvaRecap.totalHT ?? devisTotal(devis);
  const dateDevis = formatDate(devis.dateDevis ?? devis.date);
  const tvaIntracom = parametres.tvaIntracom?.trim();
  const logoEntreprise = getLogoPdf(parametres);
  const adresseEntreprise = formatAdresseEntreprise(parametres);
  const pdfTauxTVA = getEffectiveTauxTVA(parametres, devis.tauxTVA);
  const pdfRecap = tvaRecap;
  const pdfTotalTTC = isTvaClassique(parametres) ? pdfRecap.totalTTC : total;
  const pdfMontantTVA = isTvaClassique(parametres) ? pdfRecap.tvaTotale : 0;
  const adresseChantier = devis.adresseChantier?.trim() || getClientAddress(client);
  const isSigned = Boolean(devis.signature && devis.dateSignature);
  const pdfLignes = getPdfLignes(devis);

  if (logoEntreprise) {
    try {
      const imageProperties = doc.getImageProperties(logoEntreprise);
      const boxSize = 14;
      const ratio = Math.min(
        boxSize / imageProperties.width,
        boxSize / imageProperties.height,
      );
      const logoWidth = imageProperties.width * ratio;
      const logoHeight = imageProperties.height * ratio;
      doc.addImage(
        logoEntreprise,
        imageProperties.fileType,
        margin + (boxSize - logoWidth) / 2,
        y - 5 + (boxSize - logoHeight) / 2,
        logoWidth,
        logoHeight,
      );
    } catch {
      doc.setFillColor(...brandColor.rgb);
      doc.roundedRect(margin, y - 4, 12, 12, 3, 3, "F");
      y = addText("B", margin + 4.2, y + 3.7, {
        size: 13,
        style: "bold",
        color: [255, 255, 255],
      });
    }
  } else {
    doc.setFillColor(...brandColor.rgb);
    doc.roundedRect(margin, y - 4, 12, 12, 3, 3, "F");
    y = addText("B", margin + 4.2, y + 3.7, {
      size: 13,
      style: "bold",
      color: [255, 255, 255],
    });
  }
  y = 14;
  y = addText("Batimum", margin + 16, y, {
    size: 18,
    style: "bold",
    color: [15, 15, 15],
  });
  y = addText(parametres.entreprise, margin + 16, y, {
    size: 8.5,
    style: "bold",
    color: [55, 55, 55],
  });
  if (adresseEntreprise) {
    y = addText(adresseEntreprise, margin + 16, y, {
      size: 7.5,
      color: [90, 90, 90],
      maxWidth: 82,
    });
  }
  if (parametres.siteInternet?.trim()) {
    y = addText(parametres.siteInternet.trim(), margin + 16, y, {
      size: 7.5,
      color: [90, 90, 90],
      maxWidth: 82,
    });
  }
  const headerContact = [parametres.telephone?.trim(), parametres.email?.trim()].filter(
    Boolean,
  );
  if (headerContact.length > 0) {
    y = addText(headerContact.join(" — "), margin + 16, y, {
      size: 7.5,
      color: [90, 90, 90],
      maxWidth: 82,
    });
  }
  if (parametres.siret?.trim()) {
    y = addText(`SIRET : ${parametres.siret.trim()}`, margin + 16, y, {
      size: 7.5,
      color: [90, 90, 90],
      maxWidth: 82,
    });
  }
  if (tvaIntracom) {
    y = addText(`TVA intracom. : ${tvaIntracom}`, margin + 16, y, {
      size: 7.5,
      color: [90, 90, 90],
      maxWidth: 82,
    });
  }

  doc.setFillColor(245, 247, 251);
  doc.roundedRect(pageWidth - 70, 12, 58, 30, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 15, 15);
  doc.text("DEVIS", pageWidth - margin - 4, 21, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(`N° ${devis.numero}`, pageWidth - margin - 4, 28, { align: "right" });
  doc.text(dateDevis, pageWidth - margin - 4, 34, { align: "right" });
  doc.text(`Validité : ${devis.validiteJours} jours`, pageWidth - margin - 4, 39, {
    align: "right",
  });

  y = 50;
  doc.setDrawColor(...brandColor.rgb);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y - 4, 88, 30, 3, 3, "F");
  doc.roundedRect(pageWidth - margin - 88, y - 4, 88, 30, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...brandColor.rgb);
  doc.text("Client", margin + 4, y);
  doc.text("Informations devis", pageWidth - margin - 84, y);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(8);
  doc.text(getClientDisplayName(client), margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.setFontSize(7.5);
  doc.text(doc.splitTextToSize(getClientAddress(client), 78), margin + 4, y + 12);
  doc.text(`Email : ${client?.email ?? "-"}`, margin + 4, y + 22);
  doc.text(`Tél. : ${client?.telephone ?? "-"}`, margin + 4, y + 27);
  doc.text(`Statut : ${DEVIS_STATUT_LABELS[devis.statut]}`, pageWidth - margin - 84, y + 6);
  doc.text(`Date devis : ${dateDevis}`, pageWidth - margin - 84, y + 12);
  doc.text(`Adresse chantier :`, pageWidth - margin - 84, y + 18);
  doc.text(doc.splitTextToSize(adresseChantier, 78), pageWidth - margin - 84, y + 24);

  y += 32;
  addSectionTitle("Description chantier");
  y = addText(devis.titre, margin, y, { size: 8.5, style: "bold" });

  addSectionTitle("Lignes du devis");
  const ligneDefaultTva = resolveLigneDefaultTva(devis, parametres.tva ?? 20);
  const table = {
    description: margin + 2,
    quantite: 82,
    unite: 96,
    prix: 116,
    tva: 132,
    totalHt: 152,
    total: pageWidth - margin - 2,
    right: pageWidth - margin,
  };

  const drawLigneHeader = () => {
    doc.setFillColor(245, 247, 251);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(20, 20, 20);
    doc.text("Description", table.description, y);
    doc.text("Qté", table.quantite, y, { align: "right" });
    doc.text("Unité", table.unite, y);
    doc.text("P.U. HT", table.prix, y, { align: "right" });
    doc.text("TVA", table.tva, y);
    doc.text("Total HT", table.totalHt, y, { align: "right" });
    doc.text("Total TTC", table.total, y, { align: "right" });
  };

  drawLigneHeader();

  const sectionSubtotals = getSectionSubtotalsAfterIndex(pdfLignes, ligneDefaultTva);

  const drawSectionSubtotalRow = (subtotal: {
    sectionTitle: string;
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
  }) => {
    const rowHeight = 7;
    if (y + rowHeight > 255) {
      doc.addPage();
      y = 22;
      drawLigneHeader();
    }

    y += 5;
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y - 4, pageWidth - margin * 2, rowHeight, "F");
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y - 3, table.right, y - 3);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text(
      formatSectionSubtotalLabel(
        subtotal.sectionTitle,
        subtotal.totalHT,
        formatPdfCurrency,
      ),
      table.description,
      y,
    );
    if (isTvaClassique(parametres) && subtotal.totalTVA > 0) {
      doc.text(formatPdfCurrency(subtotal.totalTVA), table.tva, y);
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(formatPdfCurrency(subtotal.totalHT), table.totalHt, y, {
      align: "right",
    });
    if (isTvaClassique(parametres)) {
      doc.text(formatPdfCurrency(subtotal.totalTTC), table.total, y, {
        align: "right",
      });
    }
    y += rowHeight - 2;
  };

  pdfLignes.forEach((ligne, index) => {
    if (isSectionLigne(ligne)) {
      const sectionTitle = getLigneDesignation(ligne).trim() || "Section";
      const descriptionLines = splitDevisPdfDescription(
        doc,
        sectionTitle.toUpperCase(),
        table.quantite - table.description - 5,
      );
      const rowHeight = Math.max(7, descriptionLines.length * 3.8 + 2);

      if (y + rowHeight > 255) {
        doc.addPage();
        y = 22;
        drawLigneHeader();
      }

      y += 6;
      doc.setFillColor(240, 244, 252);
      doc.rect(margin, y - 4, pageWidth - margin * 2, rowHeight, "F");
      doc.setDrawColor(210, 220, 235);
      doc.line(margin, y - 3, table.right, y - 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...brandColor.rgb);
      doc.text(descriptionLines, table.description, y);
      y += rowHeight - 4;
      return;
    }

    const lineHT = ligneMontantHT(ligne);
    const lineTTC = isTvaClassique(parametres)
      ? ligneMontantTTC(ligne, ligneDefaultTva)
      : lineHT;
    const descriptionLines = splitDevisPdfDescription(
      doc,
      getLignePdfDescription(ligne),
      table.quantite - table.description - 5,
    );
    const rowHeight = Math.max(6.5, descriptionLines.length * 3.8 + 2);

    if (y + rowHeight > 255) {
      doc.addPage();
      y = 22;
      drawLigneHeader();
    }

    y += 6;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y - 3, table.right, y - 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(20, 20, 20);
    doc.text(descriptionLines, table.description, y);
    doc.setFontSize(7.5);
    doc.text(String(ligne.quantite), table.quantite, y, { align: "right" });
    doc.text(ligne.unite ?? "forfait", table.unite, y);
    doc.text(formatPdfCurrency(ligne.prixUnitaire), table.prix, y, {
      align: "right",
    });
    doc.text(formatTvaLigneLabel(ligne, ligneDefaultTva), table.tva, y);
    doc.text(formatPdfCurrency(lineHT), table.totalHt, y, {
      align: "right",
    });
    doc.text(formatPdfCurrency(lineTTC), table.total, y, {
      align: "right",
    });
    y += rowHeight - 6;

    const subtotal = sectionSubtotals.get(index);
    if (subtotal) {
      drawSectionSubtotalRow(subtotal);
    }
  });

  y += 4;
  if (y > 224) {
    doc.addPage();
    y = 24;
  }

  const totalsBoxX = pageWidth - margin - 78;
  const recapLines = isTvaClassique(parametres)
    ? [
        { label: "Total HT", value: formatPdfCurrency(pdfRecap.totalHT) },
        ...(pdfRecap.tva55 > 0
          ? [{ label: "TVA 5,5 %", value: formatPdfCurrency(pdfRecap.tva55) }]
          : []),
        ...(pdfRecap.tva10 > 0
          ? [{ label: "TVA 10 %", value: formatPdfCurrency(pdfRecap.tva10) }]
          : []),
        ...(pdfRecap.tva20 > 0
          ? [{ label: "TVA 20 %", value: formatPdfCurrency(pdfRecap.tva20) }]
          : []),
        { label: "TVA totale", value: formatPdfCurrency(pdfRecap.tvaTotale) },
      ]
    : [{ label: "Total HT", value: formatPdfCurrency(total) }];
  const boxHeight = isTvaClassique(parametres)
    ? 14 + recapLines.length * 7 + 12
    : 28;

  doc.setFillColor(245, 247, 251);
  doc.roundedRect(totalsBoxX, y, 78, boxHeight, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);

  let recapY = y + 7;
  recapLines.forEach((line) => {
    doc.text(line.label, totalsBoxX + 5, recapY);
    doc.text(line.value, totalsBoxX + 73, recapY, { align: "right" });
    recapY += 7;
  });

  if (!isTvaClassique(parametres)) {
    doc.text("TVA non applicable", totalsBoxX + 5, recapY);
    doc.text("Art. 293 B", totalsBoxX + 73, recapY, { align: "right" });
    recapY += 7;
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(totalsBoxX + 5, recapY + 1, totalsBoxX + 73, recapY + 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...brandColor.rgb);
  doc.text("Total TTC", totalsBoxX + 5, recapY + 8);
  doc.text(formatPdfCurrency(pdfTotalTTC), totalsBoxX + 73, recapY + 8, {
    align: "right",
  });

  y += boxHeight + 4;

  if (y > 235) {
    doc.addPage();
    y = 24;
  }

  addSectionTitle("Mentions légales et conditions");
  const footerMentions = buildDevisPdfFooterMentions(parametres, {
    pdfTauxTVA,
    pdfMontantTVA,
    formatCurrency: formatPdfCurrency,
  });
  for (const mention of footerMentions) {
    y = addText(mention.text, margin, y, {
      size: 7.5,
      color: [70, 70, 70],
      maxWidth: pageWidth - margin * 2,
    });
  }
  if (parametres.acompte?.trim()) {
    y = addText(`Acompte : ${parametres.acompte.trim()}`, margin, y, {
      size: 7.5,
      color: [70, 70, 70],
    });
  }
  if (parametres.penalitesRetard?.trim()) {
    y = addText(`Pénalités de retard : ${parametres.penalitesRetard.trim()}`, margin, y, {
      size: 7.5,
      color: [70, 70, 70],
      maxWidth: pageWidth - margin * 2,
    });
  }
  if (parametres.indemniteForfaitaire?.trim()) {
    y = addText(
      `Indemnité forfaitaire : ${parametres.indemniteForfaitaire.trim()}`,
      margin,
      y,
      { size: 7.5, color: [70, 70, 70], maxWidth: pageWidth - margin * 2 },
    );
  }
  if (parametres.tribunalCompetent?.trim()) {
    y = addText(`Tribunal compétent : ${parametres.tribunalCompetent.trim()}`, margin, y, {
      size: 7.5,
      color: [70, 70, 70],
      maxWidth: pageWidth - margin * 2,
    });
  }
  if (parametres.assuranceDecennale && parametres.nomAssurance?.trim()) {
    y = addText(
      `Assurance décennale : ${parametres.nomAssurance.trim()}${parametres.numeroPoliceAssurance?.trim() ? ` — Police n° ${parametres.numeroPoliceAssurance.trim()}` : ""}`,
      margin,
      y,
      { size: 7.5, color: [70, 70, 70], maxWidth: pageWidth - margin * 2 },
    );
  }
  if (devis.dateDebutTravauxEstimee) {
    y = addText(
      `Date de début des travaux (estimée) : ${formatDate(devis.dateDebutTravauxEstimee)}`,
      margin,
      y,
      { size: 7.5, color: [70, 70, 70] },
    );
  }
  y += 2;
  y = addText("Bon pour accord", margin, y, {
    size: 9,
    style: "bold",
    color: [20, 20, 20],
  });
  y = addText(
    "Signature précédée de la mention « Lu et approuvé », bon pour accord du devis et commande des travaux.",
    margin,
    y,
    { size: 7.5, color: [70, 70, 70], maxWidth: pageWidth - margin * 2 },
  );
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y + 3, margin + 70, y + 3);
  doc.line(margin + 95, y + 3, margin + 165, y + 3);
  y = addText("Date", margin, y + 7, { size: 7, color: [120, 120, 120] });
  doc.text("Signature client", margin + 95, y + 7);

  if (parametres.signaturePdf?.trim()) {
    y += 14;
    addSectionTitle("Signature entreprise");
    y = addText(parametres.signaturePdf.trim(), margin, y, {
      size: 7.5,
      color: [70, 70, 70],
      maxWidth: pageWidth - margin * 2,
    });
  }

  if (isSigned) {
    addSectionTitle("Signature électronique du client");
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 58, 3, 3, "F");
    y = addText("Devis accepté et signé électroniquement", margin + 4, y, {
      size: 9,
      style: "bold",
      color: brandColor.rgb,
    });
    y = addText(
      `Nom signataire : ${devis.signedBy ?? devis.nomSignataire ?? "-"}`,
      margin + 4,
      y,
      { size: 7.8 },
    );
    y = addText(
      `Date et heure : ${
        devis.signedAt || devis.dateSignature
          ? formatDateTimeFR(devis.signedAt ?? devis.dateSignature!)
          : "-"
      }`,
      margin + 4,
      y,
      { size: 7.8 },
    );
    y = addText(`Email client : ${client?.email?.trim() || "-"}`, margin + 4, y, {
      size: 7.8,
    });
    if (devis.signature) {
      const signatureProperties = doc.getImageProperties(devis.signature);
      const signatureBox = { width: 62, height: 15 };
      const signatureRatio = Math.min(
        signatureBox.width / signatureProperties.width,
        signatureBox.height / signatureProperties.height,
      );
      const signatureWidth = signatureProperties.width * signatureRatio;
      const signatureHeight = signatureProperties.height * signatureRatio;
      doc.addImage(
        devis.signature,
        "PNG",
        margin + 4 + (signatureBox.width - signatureWidth) / 2,
        y + 1 + (signatureBox.height - signatureHeight) / 2,
        signatureWidth,
        signatureHeight,
      );
      y += 18;
    }
    y = addText("Bon pour accord — devis accepté électroniquement.", margin + 4, y + 1, {
      size: 8.5,
      style: "bold",
      color: [20, 20, 20],
    });
  } else {
    addSectionTitle("Signature électronique du client");
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 16, 3, 3, "F");
    y = addText("En attente de signature client", margin + 4, y, {
      size: 8.5,
      color: [90, 90, 90],
    });
  }

  return doc;
}

export async function downloadDevisPdf(options: BuildDevisPdfOptions): Promise<void> {
  if (hasOfficialSignedDevisPdf(options.devis)) {
    downloadStoredSignedDevisPdf(options.devis);
    return;
  }

  const doc = await buildDevisPdfDoc(options);
  const suffix =
    options.devis.statut === "signe" || options.devis.signature ? "-signe" : "";
  doc.save(`${options.devis.numero}-devis${suffix}.pdf`);
}

export function downloadStoredSignedDevisPdf(devis: Devis): void {
  const stored =
    devis.signedPdfBase64 ?? loadSignedDevisPdf(devis.id);
  if (!stored) return;
  const link = document.createElement("a");
  link.href = `data:application/pdf;base64,${stored}`;
  link.download = `${devis.numero}-devis-signe.pdf`;
  link.click();
}

export async function downloadSignedDevisPdf(
  options: BuildDevisPdfOptions,
): Promise<void> {
  if (options.devis.signedPdfBase64 || loadSignedDevisPdf(options.devis.id)) {
    downloadStoredSignedDevisPdf(options.devis);
    return;
  }
  await downloadDevisPdf(options);
}

export async function getDevisPdfBase64(options: BuildDevisPdfOptions): Promise<string> {
  const doc = await buildDevisPdfDoc(options);
  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1];
  return base64 ?? "";
}

export function resolveOfficialSignedDevisPdfBase64(devis: Devis): string | undefined {
  return devis.signedPdfBase64 ?? loadSignedDevisPdf(devis.id);
}

export function hasOfficialSignedDevisPdf(devis: Devis): boolean {
  return Boolean(
    (devis.statut === "signe" || devis.signature) &&
      resolveOfficialSignedDevisPdfBase64(devis),
  );
}

function createPdfObjectUrlFromBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

export function getOfficialDevisPdfObjectUrl(devis: Devis): string | null {
  const base64 = resolveOfficialSignedDevisPdfBase64(devis);
  if (!base64) return null;
  return createPdfObjectUrlFromBase64(base64);
}

export async function getDevisPdfObjectUrl(
  options: BuildDevisPdfOptions,
): Promise<string> {
  const officialUrl = getOfficialDevisPdfObjectUrl(options.devis);
  if (officialUrl) return officialUrl;

  const doc = await buildDevisPdfDoc(options);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

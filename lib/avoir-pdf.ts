import { getClientDisplayName } from "./clients";
import {
  formatAdresseEntreprise,
  getEffectiveTauxTVA,
  getLogoPdf,
  getMentionTvaPdf,
  isTvaClassique,
} from "./parametres";
import type { Avoir, Client, Parametres } from "./types";
import { formatCurrency, formatDate } from "./utils";

export async function downloadAvoirPdf(
  avoir: Avoir,
  client: Client | undefined,
  parametres: Parametres,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 22;

  const logo = getLogoPdf(parametres);
  if (logo) {
    try {
      doc.addImage(logo, "PNG", margin, y - 6, 36, 18);
      y += 16;
    } catch {
      // ignore invalid logo
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text("AVOIR", pageWidth - margin, y, { align: "right" });
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(avoir.numero, pageWidth - margin, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(`Date : ${formatDate(avoir.dateEmission)}`, pageWidth - margin, y, {
    align: "right",
  });

  y = Math.max(y + 10, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(parametres.entreprise, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(formatAdresseEntreprise(parametres), margin, y);
  y += 4;
  doc.text(`SIRET : ${parametres.siret}`, margin, y);

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("Client", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(getClientDisplayName(client), margin, y);
  if (client?.adresse) {
    y += 4;
    doc.text(client.adresse, margin, y);
  }

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Facture d'origine : ${avoir.factureNumero}`, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(
    `Type : ${avoir.mode === "total" ? "Avoir total" : "Avoir partiel"}`,
    margin,
    y,
  );

  if (avoir.motif) {
    y += 6;
    const motifLines = doc.splitTextToSize(`Motif : ${avoir.motif}`, pageWidth - margin * 2);
    doc.text(motifLines, margin, y);
    y += motifLines.length * 4;
  }

  y += 10;
  const tauxTVA = getEffectiveTauxTVA(parametres, avoir.tauxTVA);
  const montantTVA = Math.round((avoir.montantTTC - avoir.montantHT) * 100) / 100;
  const boxX = pageWidth - margin - 78;

  doc.setFillColor(245, 247, 251);
  doc.roundedRect(boxX, y, 78, 28, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text("Montant HT", boxX + 5, y + 7);
  doc.text(formatCurrency(avoir.montantHT), boxX + 73, y + 7, { align: "right" });
  if (isTvaClassique(parametres)) {
    doc.text(`TVA (${tauxTVA}%)`, boxX + 5, y + 14);
    doc.text(formatCurrency(montantTVA), boxX + 73, y + 14, { align: "right" });
  }
  doc.setDrawColor(220, 220, 220);
  doc.line(boxX + 5, y + 18, boxX + 73, y + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text("Total TTC", boxX + 5, y + 25);
  doc.text(formatCurrency(avoir.montantTTC), boxX + 73, y + 25, { align: "right" });

  y += 38;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  const mention = getMentionTvaPdf(
    parametres,
    tauxTVA,
    montantTVA,
    formatCurrency,
  );
  doc.text(mention, margin, y, { maxWidth: pageWidth - margin * 2 });
  y += 8;
  doc.text(
    "Cet avoir vient en déduction de la facture référencée ci-dessus.",
    margin,
    y,
    { maxWidth: pageWidth - margin * 2 },
  );

  doc.save(`${avoir.numero}-avoir.pdf`);
}

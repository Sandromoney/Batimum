import { getClientDisplayName } from "./clients";
import { buildFactureElectroniqueExport } from "./facture-electronique";
import { factureMontantHT } from "./factures";
import {
  deriveSirenFromSiret,
  formatAdresseEntreprise,
  getEffectiveTauxTVA,
  getEmailFacturation,
  getLogoPdf,
  getMentionTvaPdf,
  isTvaClassique,
} from "./parametres";
import {
  formatCoordonneesBancairesLines,
  shouldShowCoordonneesBancaires,
} from "./coordonnees-bancaires";
import type { Client, Facture, Parametres } from "./types";
import { formatCurrency, formatDate } from "./utils";

type FacturePdfInput = {
  facture: Facture;
  client?: Client;
  parametres: Parametres;
};

function isClientProfessionnel(client?: Client) {
  return client?.typeClient === "professionnel" || Boolean(client?.siret?.trim());
}

async function renderFacturePdf(
  { facture, client, parametres }: FacturePdfInput,
  mode: "download" | "base64",
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 22;

  const montantHT = facture.montantHT ?? factureMontantHT(facture);
  const montantTTC = facture.montantTTC ?? facture.montant;
  const tauxTVA = getEffectiveTauxTVA(parametres, facture.tauxTVA);
  const montantTVA = Math.round((montantTTC - montantHT) * 100) / 100;
  const siren = parametres.siren?.trim() || deriveSirenFromSiret(parametres.siret);

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
  doc.text("FACTURE", pageWidth - margin, y, { align: "right" });
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(facture.numero, pageWidth - margin, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(
    `Date d'émission : ${formatDate(facture.dateEmission)}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  y += 5;
  doc.text(
    `Date d'échéance : ${formatDate(facture.dateEcheance)}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );

  y = Math.max(y + 10, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  const vendeurLabel = parametres.formeJuridique
    ? `${parametres.entreprise} — ${parametres.formeJuridique}`
    : parametres.entreprise;
  doc.text(vendeurLabel, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(formatAdresseEntreprise(parametres), margin, y);
  y += 4;
  doc.text(`SIRET : ${parametres.siret} · SIREN : ${siren}`, margin, y);
  if (parametres.tvaIntracom?.trim()) {
    y += 4;
    doc.text(`TVA intracom. : ${parametres.tvaIntracom.trim()}`, margin, y);
  }
  y += 4;
  doc.text(`Email facturation : ${getEmailFacturation(parametres)}`, margin, y);

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
  if (client?.siret?.trim()) {
    y += 4;
    doc.text(`SIRET : ${client.siret}`, margin, y);
  }
  if (client?.tvaIntracom?.trim()) {
    y += 4;
    doc.text(`TVA intracom. : ${client.tvaIntracom}`, margin, y);
  }

  y += 12;
  if (facture.lignes?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Désignation", margin, y);
    doc.text("Qté", pageWidth - margin - 70, y, { align: "right" });
    doc.text("P.U. HT", pageWidth - margin - 42, y, { align: "right" });
    doc.text("Total HT", pageWidth - margin, y, { align: "right" });
    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    for (const ligne of facture.lignes) {
      const lineTotal = ligne.quantite * ligne.prixUnitaire;
      const descLines = doc.splitTextToSize(ligne.description, pageWidth - margin * 2 - 80);
      doc.text(descLines, margin, y);
      const lineHeight = Math.max(descLines.length * 4, 4);
      doc.text(String(ligne.quantite), pageWidth - margin - 70, y, { align: "right" });
      doc.text(formatCurrency(ligne.prixUnitaire), pageWidth - margin - 42, y, {
        align: "right",
      });
      doc.text(formatCurrency(lineTotal), pageWidth - margin, y, { align: "right" });
      y += lineHeight + 2;
    }
  }

  y += 6;
  const boxX = pageWidth - margin - 78;
  doc.setFillColor(245, 247, 251);
  doc.roundedRect(boxX, y, 78, isTvaClassique(parametres) ? 28 : 20, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text("Total HT", boxX + 5, y + 7);
  doc.text(formatCurrency(montantHT), boxX + 73, y + 7, { align: "right" });
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
  doc.text(formatCurrency(montantTTC), boxX + 73, y + 25, { align: "right" });

  y += 38;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);

  const legalLines: string[] = [];
  if (parametres.conditionsReglement?.trim()) {
    legalLines.push(`Conditions de paiement : ${parametres.conditionsReglement.trim()}`);
  }
  if (shouldShowCoordonneesBancaires(parametres)) {
    const bankLines = formatCoordonneesBancairesLines(parametres);
    if (bankLines.length > 0) {
      legalLines.push(`Coordonnées bancaires : ${bankLines.join(" — ")}`);
    }
  }
  if (parametres.penalitesRetard?.trim()) {
    legalLines.push(parametres.penalitesRetard.trim());
  }
  if (isClientProfessionnel(client) && parametres.indemniteForfaitaire?.trim()) {
    legalLines.push(parametres.indemniteForfaitaire.trim());
  }
  legalLines.push(
    getMentionTvaPdf(parametres, tauxTVA, montantTVA, formatCurrency),
  );
  if (parametres.tribunalCompetent?.trim()) {
    legalLines.push(parametres.tribunalCompetent.trim());
  }

  for (const line of legalLines) {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.5 + 2;
  }

  const exportPayload = buildFactureElectroniqueExport({
    facture,
    client,
    parametres,
  });
  y += 4;
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Données structurées préparées pour facturation électronique (Factur-X / PDP) — transmission non activée.",
    margin,
    y,
    { maxWidth: pageWidth - margin * 2 },
  );
  y += 8;
  const metaLine = `Réf. export : ${exportPayload.facture.numero} · ${exportPayload.format} v${exportPayload.version}`;
  doc.text(metaLine, margin, y);

  const filename = `${facture.numero}-facture.pdf`;
  if (mode === "download") {
    doc.save(filename);
    return undefined;
  }
  return doc.output("datauristring").split(",")[1] ?? "";
}

export async function downloadFacturePdf(input: FacturePdfInput) {
  await renderFacturePdf(input, "download");
}

export async function getFacturePdfBase64(input: FacturePdfInput) {
  return renderFacturePdf(input, "base64");
}

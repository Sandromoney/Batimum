import {
  getTarifPrixAchatHT,
  getTarifPrixAchatTTC,
  ttcFromHt,
} from "@/lib/fournisseur-prix-utils";
import type {
  EntreprisePriceLibraryEntry,
  Fournisseur,
  FournisseurTarifLigne,
} from "@/lib/types";
import { formatCurrency, formatDateFR } from "@/lib/utils";
import {
  getFournisseurDepotLabel,
  getFournisseurEnseigneLabel,
} from "@/lib/fourniture/helpers";

const EMERALD: [number, number, number] = [16, 185, 129];
const TEXT: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [100, 100, 100];

function money(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return formatCurrency(value);
}

function ensureSpace(doc: import("jspdf").jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 12) {
    doc.addPage();
    return 16;
  }
  return y;
}

export async function exportFournisseurListePdf(
  fournisseur: Fournisseur,
  tarifs: FournisseurTarifLigne[],
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const exportDate = formatDateFR(new Date().toISOString().slice(0, 10));
  let y = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...EMERALD);
  doc.text("Liste tarifaire fournisseur", 14, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(`Fournisseur : ${getFournisseurEnseigneLabel(fournisseur)}`, 14, y);
  y += 4.5;
  doc.text(`Dépôt : ${getFournisseurDepotLabel(fournisseur)}`, 14, y);
  y += 4.5;
  const adresse = [fournisseur.adresseDepot, fournisseur.ville, fournisseur.codePostal]
    .filter(Boolean)
    .join(" ");
  if (adresse) {
    doc.text(`Adresse : ${adresse}`, 14, y);
    y += 4.5;
  }
  doc.text(`Date d'export : ${exportDate}`, 14, y);
  y += 4.5;
  doc.text(`Nombre de produits : ${tarifs.length}`, 14, y);
  if (fournisseur.dateDerniereMiseAJour) {
    y += 4.5;
    doc.text(
      `Dernière mise à jour : ${formatDateFR(fournisseur.dateDerniereMiseAJour.slice(0, 10))}`,
      14,
      y,
    );
  }

  y += 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, doc.internal.pageSize.getWidth() - 14, y);
  y += 6;

  const headers = [
    "Réf.",
    "Désignation",
    "Catégorie",
    "Unité",
    "Achat HT",
    "Achat TTC",
    "TVA",
    "Vente HT",
    "Vente TTC",
  ];
  const colX = [14, 32, 88, 108, 118, 142, 166, 178, 202, 226];

  function drawTableHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], colX[i], y);
    }
    y += 3;
    doc.line(14, y, doc.internal.pageSize.getWidth() - 14, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
  }

  drawTableHeader();

  for (const line of tarifs) {
    y = ensureSpace(doc, y, 6);
    if (y === 16) drawTableHeader();

    const tva = line.tauxTVA ?? 20;
    const achatHT = getTarifPrixAchatHT(line);
    const achatTTC = getTarifPrixAchatTTC(line, tva);
    const venteHT = line.prixVenteHT;
    const venteTTC =
      venteHT != null ? line.prixVenteTTC ?? ttcFromHt(venteHT, tva) : undefined;

    doc.setFontSize(7);
    const row = [
      (line.reference ?? "—").slice(0, 14),
      line.nomProduit.slice(0, 42),
      (line.categorie ?? "—").slice(0, 14),
      line.unite ?? "u",
      money(achatHT),
      money(achatTTC),
      `${tva} %`,
      money(venteHT),
      money(venteTTC),
    ];
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], colX[i], y);
    }
    y += 5;
  }

  const slug = getFournisseurEnseigneLabel(fournisseur)
    .replace(/[^\w\-]+/g, "-")
    .toLowerCase();
  doc.save(`fournisseur-${slug}-${exportDate.replace(/\//g, "-")}.pdf`);
}

export type ComparatifPdfRow = {
  entry: EntreprisePriceLibraryEntry;
  fournisseur?: Fournisseur;
  isBest?: boolean;
};

export async function exportComparatifPdf(
  searchLabel: string,
  rows: ComparatifPdfRow[],
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const exportDate = formatDateFR(new Date().toISOString().slice(0, 10));
  let y = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...EMERALD);
  doc.text("Comparatif de prix", 14, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(`Recherche : ${searchLabel || "Tous les produits"}`, 14, y);
  y += 4.5;
  doc.text(`Date d'export : ${exportDate}`, 14, y);
  y += 4.5;
  doc.text(`Lignes : ${rows.length}`, 14, y);

  y += 8;
  doc.line(14, y, doc.internal.pageSize.getWidth() - 14, y);
  y += 6;

  const headers = [
    "Produit",
    "Réf.",
    "Fournisseur",
    "Dépôt",
    "Achat HT",
    "Achat TTC",
    "Vente HT",
    "Vente TTC",
    "TVA",
    "MAJ",
    "Meilleur",
  ];
  const colX = [14, 48, 62, 92, 118, 138, 158, 178, 198, 210, 240];

  function drawTableHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], colX[i], y);
    }
    y += 3;
    doc.line(14, y, doc.internal.pageSize.getWidth() - 14, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
  }

  drawTableHeader();

  for (const { entry, fournisseur, isBest } of rows) {
    y = ensureSpace(doc, y, 6);
    if (y === 16) drawTableHeader();

    const tva = entry.vatRate ?? 20;
    const achatHT = entry.purchasePriceHT;
    const achatTTC = achatHT != null ? ttcFromHt(achatHT, tva) : undefined;
    const venteHT = entry.salePriceHT;
    const venteTTC = venteHT != null ? ttcFromHt(venteHT, tva) : undefined;

    doc.setFontSize(7);
    if (isBest) doc.setTextColor(...EMERALD);
    const row = [
      entry.name.slice(0, 22),
      (entry.reference ?? "—").slice(0, 10),
      (fournisseur
        ? getFournisseurEnseigneLabel(fournisseur)
        : entry.supplierName ?? "—"
      ).slice(0, 18),
      (fournisseur ? getFournisseurDepotLabel(fournisseur) : "—").slice(0, 16),
      money(achatHT),
      money(achatTTC),
      money(venteHT),
      money(venteTTC),
      `${tva} %`,
      formatDateFR(entry.lastUpdatedAt.slice(0, 10)),
      isBest ? "Oui" : "—",
    ];
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], colX[i], y);
    }
    doc.setTextColor(...TEXT);
    y += 5;
  }

  const slug = (searchLabel || "comparatif")
    .replace(/[^\w\-]+/g, "-")
    .toLowerCase()
    .slice(0, 40);
  doc.save(`comparatif-${slug}-${exportDate.replace(/\//g, "-")}.pdf`);
}

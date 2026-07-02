"use client";

import { getLogoPdf } from "@/lib/parametres";
import type { Parametres } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const SAMPLE_LINES = [
  {
    designation: "Dépose carrelage et sanitaires existants",
    detail: "Évacuation gravats incluse",
    qty: 6,
    unit: "m²",
    price: 28,
  },
  {
    designation: "Fourniture et pose faïence murale",
    detail: "Format 20×60, joints inclus",
    qty: 18,
    unit: "m²",
    price: 65,
  },
  {
    designation: "Installation meuble vasque",
    detail: "Pose, raccordements et étanchéité",
    qty: 1,
    unit: "forfait",
    price: 420,
  },
  {
    designation: "Peinture plafond satin",
    detail: "2 couches, préparation légère",
    qty: 6,
    unit: "m²",
    price: 22,
  },
] as const;

type DevisColorSamplePreviewProps = {
  brandHex: string;
  parametres: Parametres;
  compact?: boolean;
  /** Aperçu temps réel de la signature dirigeant (prioritaire sur parametres.signaturePdf). */
  signaturePreview?: string | null;
};

export function DevisColorSamplePreview({
  brandHex,
  parametres,
  compact = false,
  signaturePreview,
}: DevisColorSamplePreviewProps) {
  const signatureSrc =
    signaturePreview?.startsWith("data:image")
      ? signaturePreview
      : parametres.signaturePdf?.startsWith("data:image")
        ? parametres.signaturePdf
        : null;
  const logo = getLogoPdf(parametres);
  const entreprise = parametres.entreprise?.trim() || "Votre entreprise";
  const adresse = [
    parametres.adresse,
    [parametres.codePostal, parametres.ville].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(" — ");
  const totalHT = SAMPLE_LINES.reduce((sum, line) => sum + line.qty * line.price, 0);
  const tvaRate = parametres.tva ?? 20;
  const tvaAmount = totalHT * (tvaRate / 100);
  const totalTTC = totalHT + tvaAmount;
  const today = new Date().toLocaleDateString("fr-FR");

  return (
    <article
      className={`overflow-hidden rounded-xl border border-white/10 bg-white text-gray-900 shadow-2xl transition-colors duration-150 ${
        compact ? "text-[10px]" : ""
      }`}
    >
      <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 object-contain p-1"
              />
            ) : (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white"
                style={{ backgroundColor: brandHex }}
              >
                B
              </div>
            )}
            <div className="min-w-0 text-xs sm:text-sm">
              <p className="font-bold text-gray-900">{entreprise}</p>
              {adresse ? <p className="mt-0.5 text-gray-600">{adresse}</p> : null}
              {parametres.telephone ? (
                <p className="text-gray-600">{parametres.telephone}</p>
              ) : null}
            </div>
          </div>

          <div
            className="shrink-0 rounded-lg border-2 px-3 py-2 text-right transition-colors duration-150"
            style={{ borderColor: brandHex }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-150"
              style={{ color: brandHex }}
            >
              Devis
            </p>
            <p className="mt-0.5 font-mono text-xs font-bold">DEV-2026-042</p>
            <p className="mt-1 text-[10px] text-gray-600">Date : {today}</p>
            <p className="text-[10px] text-gray-600">Validité : 30 jours</p>
          </div>
        </div>
      </div>

      <div
        className="border-b border-gray-200 px-4 py-3 transition-colors duration-150 sm:px-5"
        style={{ backgroundColor: `${brandHex}06` }}
      >
        <p
          className="text-[9px] font-bold uppercase tracking-[0.18em] transition-colors duration-150"
          style={{ color: brandHex }}
        >
          Client
        </p>
        <p className="mt-1 text-xs font-semibold sm:text-sm">M. et Mme Martin</p>
        <p className="text-xs text-gray-600">12 rue des Artisans — 31000 Toulouse</p>
        <p className="mt-2 text-xs font-medium text-gray-800">
          Rénovation complète salle de bain
        </p>
      </div>

      <div className="px-4 py-3 sm:px-5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="h-0.5 flex-1 rounded-full transition-colors duration-150"
            style={{ backgroundColor: brandHex }}
          />
          <span
            className="text-[9px] font-bold uppercase tracking-[0.14em] transition-colors duration-150"
            style={{ color: brandHex }}
          >
            Détail des prestations
          </span>
          <span
            className="h-0.5 flex-1 rounded-full transition-colors duration-150"
            style={{ backgroundColor: brandHex }}
          />
        </div>

        <table className="w-full text-left text-[10px] sm:text-xs">
          <thead>
            <tr
              className="border-b-2 transition-colors duration-150"
              style={{ borderColor: brandHex, backgroundColor: `${brandHex}12` }}
            >
              <th
                className="px-1 py-2 font-semibold uppercase tracking-wide transition-colors duration-150"
                style={{ color: brandHex }}
              >
                Désignation
              </th>
              <th
                className="px-1 py-2 text-right font-semibold uppercase tracking-wide transition-colors duration-150"
                style={{ color: brandHex }}
              >
                Qté
              </th>
              <th
                className="hidden px-1 py-2 text-right font-semibold uppercase tracking-wide transition-colors duration-150 sm:table-cell"
                style={{ color: brandHex }}
              >
                P.U.
              </th>
              <th
                className="px-1 py-2 text-right font-semibold uppercase tracking-wide transition-colors duration-150"
                style={{ color: brandHex }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_LINES.map((line) => (
              <tr key={line.designation} className="border-b border-gray-100">
                <td className="py-2 pr-1 align-top">
                  <p className="font-medium text-gray-900">{line.designation}</p>
                  {!compact ? (
                    <p className="mt-0.5 text-[10px] text-gray-500">{line.detail}</p>
                  ) : null}
                </td>
                <td className="py-2 text-right tabular-nums text-gray-700">
                  {line.qty} {line.unit}
                </td>
                <td className="hidden py-2 text-right tabular-nums text-gray-700 sm:table-cell">
                  {formatCurrency(line.price)}
                </td>
                <td className="py-2 text-right tabular-nums font-medium text-gray-900">
                  {formatCurrency(line.qty * line.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          className="mt-3 ml-auto max-w-[14rem] rounded-lg border px-3 py-2 transition-colors duration-150"
          style={{
            borderColor: `${brandHex}55`,
            backgroundColor: `${brandHex}08`,
          }}
        >
          <div className="flex justify-between text-xs text-gray-700">
            <span>Total HT</span>
            <span className="tabular-nums font-medium">{formatCurrency(totalHT)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-600">
            <span>TVA {tvaRate} %</span>
            <span className="tabular-nums">{formatCurrency(tvaAmount)}</span>
          </div>
          <div
            className="mt-2 flex justify-between border-t pt-2 text-xs font-bold transition-colors duration-150"
            style={{ borderColor: `${brandHex}44`, color: brandHex }}
          >
            <span>Total TTC</span>
            <span className="tabular-nums">{formatCurrency(totalTTC)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-gray-200 px-4 py-4 sm:grid-cols-2 sm:px-5">
        <div
          className="rounded-lg border p-2 transition-colors duration-150"
          style={{ borderColor: `${brandHex}33` }}
        >
          <p
            className="text-[9px] font-bold uppercase tracking-[0.14em] transition-colors duration-150"
            style={{ color: brandHex }}
          >
            Signature dirigeant
          </p>
          {signatureSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatureSrc}
              alt=""
              className="mt-2 h-10 object-contain object-left transition-opacity duration-150"
            />
          ) : (
            <div className="mt-2 h-10 rounded border border-dashed border-gray-300 bg-gray-50" />
          )}
        </div>
        <div
          className="rounded-lg border-2 border-dashed p-2 text-center transition-colors duration-150"
          style={{ borderColor: `${brandHex}55` }}
        >
          <p
            className="text-[9px] font-bold uppercase tracking-[0.14em] transition-colors duration-150"
            style={{ color: brandHex }}
          >
            Signature client
          </p>
          <p className="mt-2 text-[10px] text-gray-500">Bon pour accord</p>
        </div>
      </div>
    </article>
  );
}

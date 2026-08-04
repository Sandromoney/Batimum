"use client";

/**
 * Parcours signature post-devis — rythme lent, lisible.
 * Libellés film : Consulter mon devis / Signer électroniquement
 * Statuts narratifs : Envoyé → Consulté → Signé → Commande confirmée
 */

import { Check, FileText, Mail } from "lucide-react";
import { FilmCursor } from "@/components/landing/landing-hub-film-cursor";

export type MumSignBeat =
  | "idle"
  | "send"
  | "sending"
  | "mail"
  | "openMail"
  | "consult"
  | "page"
  | "scroll"
  | "hoverSign"
  | "signModal"
  | "draw"
  | "validate"
  | "validating"
  | "pipeline"
  | "commande"
  | "back";

const SIGN_LINES = [
  { label: "Dépose douche existante", qty: "1 u." },
  { label: "Douche à l'italienne 120 × 90 cm", qty: "1 u." },
  { label: "Meuble double vasque 120 cm", qty: "1 u." },
  { label: "Faïence murale 30 × 60", qty: "42 m²" },
  { label: "Carrelage sol", qty: "18 m²" },
  { label: "Alimentations PER", qty: "1 u." },
  { label: "Évacuations PVC", qty: "1 u." },
  { label: "Sèche-serviettes", qty: "1 u." },
  { label: "Peinture plafond", qty: "18 m²" },
] as const;

const PRICE_MASK = "•••";

const PIPELINE = [
  "Envoyé",
  "Consulté",
  "Signé",
  "Commande confirmée",
] as const;

function GenericSignature({ drawing }: { drawing: boolean }) {
  return (
    <svg
      className={[
        "lp-hubMumSign__ink",
        drawing ? "is-drawing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      viewBox="0 0 220 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 42 C28 18, 42 52, 58 34 C72 18, 78 48, 98 36 C118 22, 128 50, 148 38 C168 26, 178 44, 198 32 C206 28, 212 30, 214 28"
        stroke="#111827"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M64 50 C78 46, 92 48, 118 46"
        stroke="#111827"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

function pipelineIndex(beat: MumSignBeat): number {
  if (beat === "back" || beat === "commande") return 3;
  if (beat === "pipeline") return 2; // Signé
  if (
    beat === "page" ||
    beat === "scroll" ||
    beat === "hoverSign" ||
    beat === "signModal" ||
    beat === "draw" ||
    beat === "validate" ||
    beat === "validating"
  ) {
    return 1; // Consulté
  }
  if (beat === "sending" || beat === "mail" || beat === "openMail" || beat === "consult") {
    return 0; // Envoyé
  }
  return -1;
}

export function MumSignJourney({ beat }: { beat: MumSignBeat }) {
  if (beat === "idle") return null;

  const showMail =
    beat === "mail" ||
    beat === "openMail" ||
    beat === "consult";
  const showPage =
    beat === "page" ||
    beat === "scroll" ||
    beat === "hoverSign" ||
    beat === "signModal" ||
    beat === "draw" ||
    beat === "validate" ||
    beat === "validating" ||
    beat === "pipeline" ||
    beat === "commande";
  const showModal =
    beat === "signModal" ||
    beat === "draw" ||
    beat === "validate" ||
    beat === "validating";
  const drawing = beat === "draw" || beat === "validate" || beat === "validating";
  const validated = beat === "validate" || beat === "validating";
  const pipeIdx = pipelineIndex(beat);
  const cursorTarget =
    beat === "send" || beat === "sending"
      ? '[data-cursor-target="sign-send"]'
      : beat === "openMail"
        ? '[data-cursor-target="sign-mail"]'
        : beat === "consult"
          ? '[data-cursor-target="sign-consult"]'
          : beat === "hoverSign" || beat === "signModal"
            ? '[data-cursor-target="sign-cta"]'
            : beat === "validate"
              ? '[data-cursor-target="sign-validate"]'
              : null;
  const showCursor = Boolean(cursorTarget);
  const cursorClick =
    beat === "sending" ||
    beat === "consult" ||
    beat === "hoverSign" ||
    beat === "validate";

  return (
    <div
      className={[
        "lp-hubMumSign",
        "is-on",
        beat === "back" ? "is-back" : "",
        beat === "scroll" ? "is-scrolling" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {(beat === "sending" ||
        beat === "mail" ||
        beat === "openMail" ||
        beat === "consult" ||
        showPage ||
        beat === "back") && (
        <div className="lp-hubMumSign__pipeline">
          {PIPELINE.map((label, i) => (
            <span
              key={label}
              className={[
                i <= pipeIdx ? "is-on" : "",
                i === pipeIdx ? "is-current" : "",
                i < pipeIdx ? "is-done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {i < pipeIdx ? <Check size={10} strokeWidth={2.6} /> : null}
              {label}
            </span>
          ))}
        </div>
      )}

      {(beat === "send" || beat === "sending") && (
        <div className="lp-hubMumSign__sendLayer">
          <button
            type="button"
            data-cursor-target="sign-send"
            className={[
              "lp-hubMumSign__sendBtn",
              beat === "sending" ? "is-pressed" : "is-on",
              beat === "send" ? "is-hover" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            tabIndex={-1}
          >
            Envoyer au client
          </button>
          {beat === "sending" ? (
            <div className="lp-hubMumSign__sendTrail" />
          ) : null}
        </div>
      )}

      {showMail ? (
        <div
          className={[
            "lp-hubMumSign__mail",
            beat === "openMail" || beat === "consult" ? "is-open" : "is-on",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="lp-hubMumSign__mailHead">
            <Mail size={14} strokeWidth={1.8} />
            <span>Boîte de réception</span>
          </div>
          <ul className="lp-hubMumSign__inbox">
            <li
              data-cursor-target="sign-mail"
              className={[
                "is-new",
                beat === "openMail" || beat === "consult" ? "is-focus" : "",
                beat === "openMail" ? "is-hover" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="lp-hubMumSign__dot" />
              <div>
                <p className="lp-hubMumSign__from">Batimum</p>
                <p className="lp-hubMumSign__subject">Votre devis - Batimum</p>
                <p className="lp-hubMumSign__preview">
                  Salle de bain · 18 m² — consultez et signez en ligne
                </p>
              </div>
            </li>
            <li>
              <div>
                <p className="lp-hubMumSign__from">Notifications</p>
                <p className="lp-hubMumSign__subject">Récapitulatif hebdo</p>
              </div>
            </li>
          </ul>
          {(beat === "openMail" || beat === "consult") && (
            <div className="lp-hubMumSign__mailBody is-on">
              <p className="lp-hubMumSign__mailGreeting">
                Bonjour Famille Martin,
              </p>
              <p className="lp-hubMumSign__mailText">
                Votre devis pour la salle de bain · 18 m² est prêt. Consultez
                le détail, puis signez électroniquement.
              </p>
              <span
                data-cursor-target="sign-consult"
                className={[
                  "lp-hubMumSign__mailCta",
                  beat === "consult" ? "is-focus" : "",
                  beat === "consult" ? "is-hover" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Consulter mon devis
              </span>
            </div>
          )}
        </div>
      ) : null}

      {showPage ? (
        <div
          className={[
            "lp-hubMumSign__page",
            "is-on",
            beat === "pipeline" ? "is-done" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {beat === "pipeline" || beat === "commande" ? (
            <div className="lp-hubMumSign__success">
              <Check size={22} strokeWidth={2.2} />
              <p>
                {beat === "commande"
                  ? "Commande confirmée"
                  : "Devis signé"}
              </p>
              <span>
                {beat === "commande"
                  ? "Le devis est mis à jour dans Batimum."
                  : "Signature électronique enregistrée."}
              </span>
            </div>
          ) : (
            <>
              <header className="lp-hubMumSign__pageHead">
                <p className="lp-hubMumSign__eyebrow">Consultation du devis</p>
                <h4>Devis DEV-2026-0142</h4>
                <p>Émis par Batimum — Famille Martin</p>
              </header>

              <div
                className={[
                  "lp-hubMumSign__card",
                  "lp-hubMumSign__scrollArea",
                  beat === "scroll" ? "is-scrolled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="lp-hubMumSign__metaRow">
                  <div>
                    <span>Client</span>
                    <strong>Famille Martin</strong>
                  </div>
                  <div>
                    <span>Objet</span>
                    <strong>Salle de bain · 18 m²</strong>
                  </div>
                </div>
                <p className="lp-hubMumSign__detailLabel">Détail du devis</p>
                <ul className="lp-hubMumSign__detail">
                  {SIGN_LINES.map((line) => (
                    <li key={line.label}>
                      <span>{line.label}</span>
                      <em>{line.qty}</em>
                      <b>{PRICE_MASK}</b>
                    </li>
                  ))}
                </ul>
                <div className="lp-hubMumSign__pageTotals">
                  <div>
                    <span>Sous-total HT</span>
                    <b>{PRICE_MASK}</b>
                  </div>
                  <div>
                    <span>TVA</span>
                    <b>{PRICE_MASK}</b>
                  </div>
                  <div className="is-grand">
                    <span>Total TTC</span>
                    <b>{PRICE_MASK}</b>
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-cursor-target="sign-cta"
                className={[
                  "lp-hubMumSign__signCta",
                  beat === "hoverSign" || showModal ? "is-focus" : "",
                  showModal ? "is-pressed" : "",
                  beat === "hoverSign" ? "is-hover" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                tabIndex={-1}
              >
                Signer électroniquement
              </button>
            </>
          )}
        </div>
      ) : null}

      {showModal ? (
        <div className="lp-hubMumSign__modal is-on">
          <div className="lp-hubMumSign__modalCard">
            <div className="lp-hubMumSign__signHead">
              <FileText size={14} strokeWidth={1.8} />
              <div>
                <strong>Signer le devis</strong>
                <p>
                  Dessinez votre signature ci-dessous pour accepter ce devis.
                </p>
              </div>
            </div>
            <div className="lp-hubMumSign__pad">
              <GenericSignature drawing={drawing} />
            </div>
            <button
              type="button"
              data-cursor-target="sign-validate"
              className={[
                "lp-hubMumSign__validate",
                drawing ? "is-on" : "",
                validated ? "is-pressed" : "",
                beat === "validating" ? "is-busy" : "",
                beat === "validate" ? "is-hover" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              tabIndex={-1}
            >
              {beat === "validating" ? "Validation…" : "Valider"}
            </button>
          </div>
        </div>
      ) : null}

      <FilmCursor
        visible={showCursor}
        target={cursorTarget}
        clicking={cursorClick}
      />
    </div>
  );
}

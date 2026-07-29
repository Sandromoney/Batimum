"use client";

/**
 * Parcours signature post-devis — fidèle au logiciel réel :
 * « Envoyer au client » → email « Votre devis - Batimum »
 * → page /signature → « Signer le devis » → « Valider ma signature »
 * → statut Envoyé → Signé (pas de statut « Consulté » dans Batimum).
 */

import { Check, FileText, Mail, MousePointer2 } from "lucide-react";

export type MumSignBeat =
  | "idle"
  | "send"
  | "sending"
  | "mail"
  | "click"
  | "page"
  | "draw"
  | "validate"
  | "signed"
  | "back";

const SIGN_LINES = [
  { label: "Douche à l'italienne 120 × 90 cm", qty: "1" },
  { label: "Meuble double vasque 120 cm", qty: "1" },
  { label: "Faïence murale 30 × 60", qty: "42" },
  { label: "Carrelage sol", qty: "18" },
] as const;

const PRICE_MASK = "···";

/** Signature manuscrite générique (aucune personne réelle). */
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

export function MumSignJourney({ beat }: { beat: MumSignBeat }) {
  if (beat === "idle") return null;

  const showMail =
    beat === "mail" ||
    beat === "click" ||
    beat === "page" ||
    beat === "draw" ||
    beat === "validate" ||
    beat === "signed";
  const showPage =
    beat === "page" ||
    beat === "draw" ||
    beat === "validate" ||
    beat === "signed";
  const drawing = beat === "draw" || beat === "validate" || beat === "signed";
  const validated = beat === "validate" || beat === "signed";
  const done = beat === "signed" || beat === "back";
  const showCursor = beat === "click" || beat === "page" || beat === "draw";

  return (
    <div
      className={[
        "lp-hubMumSign",
        "is-on",
        beat === "back" ? "is-back" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {(beat === "sending" || beat === "back") && (
        <div className="lp-hubMumSign__statusRail">
          <span
            className={[
              "lp-hubMumSign__statut",
              beat === "back" ? "is-signe" : "is-envoye",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {beat === "back" ? "Signé" : "Envoyé"}
            {beat === "back" ? <Check size={11} strokeWidth={2.6} /> : null}
          </span>
        </div>
      )}

      {(beat === "send" || beat === "sending") && (
        <div className="lp-hubMumSign__sendLayer">
          <button
            type="button"
            className={[
              "lp-hubMumSign__sendBtn",
              beat === "sending" ? "is-pressed" : "is-on",
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

      {showMail && !showPage ? (
        <div
          className={[
            "lp-hubMumSign__mail",
            beat === "click" ? "is-open" : "is-on",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="lp-hubMumSign__mailHead">
            <Mail size={14} strokeWidth={1.8} />
            <span>Boîte de réception</span>
          </div>
          <ul className="lp-hubMumSign__inbox">
            <li className="is-new is-focus">
              <span className="lp-hubMumSign__dot" />
              <div>
                <p className="lp-hubMumSign__from">Batimum</p>
                <p className="lp-hubMumSign__subject">Votre devis - Batimum</p>
                <p className="lp-hubMumSign__preview">
                  Signez votre devis en ligne — Salle de bain · 18 m²
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
          {beat === "click" ? (
            <div className="lp-hubMumSign__mailBody is-on">
              <p className="lp-hubMumSign__mailGreeting">
                Bonjour Famille Martin,
              </p>
              <p className="lp-hubMumSign__mailText">
                Veuillez trouver ci-joint le devis pour Salle de bain · 18 m².
              </p>
              <span className="lp-hubMumSign__mailCta is-focus">
                Signer le devis
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {showPage ? (
        <div
          className={[
            "lp-hubMumSign__page",
            done ? "is-done" : "is-on",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {done ? (
            <div className="lp-hubMumSign__success">
              <Check size={22} strokeWidth={2.2} />
              <p>Devis signé</p>
              <span>Le statut est mis à jour automatiquement.</span>
            </div>
          ) : (
            <>
              <header className="lp-hubMumSign__pageHead">
                <p className="lp-hubMumSign__eyebrow">Signature électronique</p>
                <h4>Devis DEV-2026-0142</h4>
                <p>Émis par Batimum — Famille Martin</p>
              </header>

              <div className="lp-hubMumSign__card">
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
              </div>

              <div className="lp-hubMumSign__card lp-hubMumSign__signCard">
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
                  className={[
                    "lp-hubMumSign__validate",
                    validated ? "is-pressed" : drawing ? "is-on" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  tabIndex={-1}
                >
                  Valider ma signature
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {showCursor ? (
        <span
          className={[
            "lp-hubMumSign__cursor",
            beat === "click" ? "is-mail" : "",
            beat === "page" ? "is-cta" : "",
            beat === "draw" ? "is-pad" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <MousePointer2 size={16} strokeWidth={1.7} />
        </span>
      ) : null}
    </div>
  );
}

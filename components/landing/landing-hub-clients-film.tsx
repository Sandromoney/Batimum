"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  runCueTimeline,
  usePauseableTimers,
} from "@/lib/landing-hub-pauseable-timer";
import {
  Building2,
  Check,
  FileText,
  HardHat,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  Receipt,
  User,
  Users,
} from "lucide-react";
import { FilmCursor } from "@/components/landing/landing-hub-film-cursor";

export const CLIENTS_HIGHLIGHT_MS = 900;
export const CLIENTS_ENTER_MS = 680;
export const CLIENTS_RETURN_MS = 750;
export const CLIENTS_DEMO_SAFETY_MS = 28000;

type ClientsBeat =
  | "list"
  | "hover"
  | "open"
  | "identity"
  | "contact"
  | "history"
  | "docs"
  | "notes"
  | "done";

const CLIENTS = [
  { id: "martin", name: "Famille Martin", city: "Lyon 3e", tag: "Actif" },
  { id: "bernard", name: "M. Bernard", city: "Villeurbanne", tag: "Devis" },
  { id: "horizon", name: "Résidence Horizon", city: "Caluire", tag: "Chantier" },
] as const;

function ClientsCopy() {
  return (
    <div className="lp-hubClients__copy">
      <h3 className="lp-hubClients__title">Clients</h3>
      <p className="lp-hubClients__subtitle">
        Coordonnées, devis, factures et chantiers — tout au même endroit.
      </p>
    </div>
  );
}

function ClientsBoard({
  beat,
  openId,
}: {
  beat: ClientsBeat;
  openId: string | null;
}) {
  const showFiche =
    beat !== "list" && beat !== "hover" && beat !== "open";
  const showIdentity =
    beat === "identity" ||
    beat === "contact" ||
    beat === "history" ||
    beat === "docs" ||
    beat === "notes" ||
    beat === "done";
  const showContact =
    beat === "contact" ||
    beat === "history" ||
    beat === "docs" ||
    beat === "notes" ||
    beat === "done";
  const showHistory =
    beat === "history" ||
    beat === "docs" ||
    beat === "notes" ||
    beat === "done";
  const showDocs = beat === "docs" || beat === "notes" || beat === "done";

  return (
    <div className="lp-hubClients__ui" aria-hidden="true">
      <div className="lp-hubClients__uiHead">
        <Users size={15} strokeWidth={1.75} />
        <span>Clients</span>
      </div>

      {!showFiche ? (
        <ul className="lp-hubClients__list">
          {CLIENTS.map((c, i) => (
            <li
              key={c.id}
              data-cursor-target={c.id === "martin" || i === 0 ? "client-row" : undefined}
              className={[
                "is-on",
                openId === c.id ? "is-selected" : "",
                (beat === "hover" || beat === "open") &&
                (openId === c.id || i === 0)
                  ? "is-hover"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <span className="lp-hubClients__avatar" aria-hidden="true">
                <User size={14} strokeWidth={1.8} />
              </span>
              <div>
                <p className="lp-hubClients__name">{c.name}</p>
                <p className="lp-hubClients__meta">{c.city}</p>
              </div>
              <span className="lp-hubClients__tag">{c.tag}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="lp-hubClients__fiche is-on">
          <div className="lp-hubClients__ficheHead">
            <span className="lp-hubClients__avatar is-lg" aria-hidden="true">
              <User size={18} strokeWidth={1.8} />
            </span>
            <div>
              <p className="lp-hubClients__name">Famille Martin</p>
              <p className="lp-hubClients__meta">Particulier · Lyon 3e</p>
            </div>
          </div>

          {showIdentity ? (
            <div className="lp-hubClients__block is-on">
              <p className="lp-hubClients__blockLabel">Identité</p>
              <ul className="lp-hubClients__rows">
                <li>
                  <User size={13} strokeWidth={1.8} />
                  <span>Jean &amp; Marie Martin</span>
                </li>
                <li>
                  <Building2 size={13} strokeWidth={1.8} />
                  <span>Particulier</span>
                </li>
              </ul>
            </div>
          ) : null}

          {showContact ? (
            <div className="lp-hubClients__block is-on">
              <p className="lp-hubClients__blockLabel">Coordonnées</p>
              <ul className="lp-hubClients__rows">
                <li>
                  <MapPin size={13} strokeWidth={1.8} />
                  <span>24 rue Garibaldi, 69003 Lyon</span>
                </li>
                <li>
                  <Phone size={13} strokeWidth={1.8} />
                  <span>06 12 34 56 78</span>
                </li>
                <li>
                  <Mail size={13} strokeWidth={1.8} />
                  <span>martin@email.fr</span>
                </li>
              </ul>
            </div>
          ) : null}

          {showHistory ? (
            <div className="lp-hubClients__block is-on">
              <p className="lp-hubClients__blockLabel">
                Devis · Factures · Chantiers
              </p>
              <ul className="lp-hubClients__hist">
                <li className="is-on">
                  <FileText size={13} strokeWidth={1.8} />
                  <span>Devis — Salle de bain 18 m²</span>
                  <Check size={12} strokeWidth={2.4} className="is-ok" />
                </li>
                <li className="is-on">
                  <Receipt size={13} strokeWidth={1.8} />
                  <span>Facture FAC-2026-0142</span>
                  <span className="lp-hubClients__pill">Acompte</span>
                </li>
                <li className="is-on">
                  <HardHat size={13} strokeWidth={1.8} />
                  <span>Chantier — Salle de bain</span>
                  <span className="lp-hubClients__pill">En cours</span>
                </li>
              </ul>
            </div>
          ) : null}

          {showDocs ? (
            <div className="lp-hubClients__block is-on">
              <p className="lp-hubClients__blockLabel">Historique &amp; notes</p>
              <p className="lp-hubClients__note">
                <NotebookPen size={13} strokeWidth={1.8} />
                Accès parking · RDV préférés sur WhatsApp
              </p>
            </div>
          ) : null}

          {beat === "done" ? (
            <p className="lp-hubClients__calm">
              Une fiche client. Toute l’activité regroupée.
            </p>
          ) : null}
        </div>
      )}

      <FilmCursor
        visible={beat === "hover" || beat === "open"}
        target={
          beat === "hover" || beat === "open"
            ? '[data-cursor-target="client-row"]'
            : null
        }
        clicking={beat === "open"}
      />
    </div>
  );
}

export function ClientsFilmPanel({
  active,
  reduced,
  paused = false,
  seekMs = 0,
  seekKey = 0,
  onDemoComplete,
}: {
  active: boolean;
  reduced: boolean;
  paused?: boolean;
  seekMs?: number;
  seekKey?: number;
  onDemoComplete: () => void;
}) {
  const [beat, setBeat] = useState<ClientsBeat>("list");
  const [openId, setOpenId] = useState<string | null>(null);
  const finishedRef = useRef(false);
  const { later, clear } = usePauseableTimers(paused);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDemoComplete();
  }, [onDemoComplete]);

  useEffect(() => {
    clear();
    finishedRef.current = false;
    setBeat("list");
    setOpenId(null);

    if (!active) return;

    if (reduced) {
      setOpenId("martin");
      setBeat("done");
      later(finish, 400);
      return clear;
    }

    runCueTimeline({
      seekMs,
      later,
      onFinish: finish,
      finishAt: 3600,
      cues: [
        {
          at: 214,
          apply: () => {
            setOpenId("martin");
            setBeat("hover");
          },
        },
        { at: 471, apply: () => setBeat("open") },
        { at: 729, apply: () => setBeat("identity") },
        { at: 1114, apply: () => setBeat("contact") },
        { at: 1543, apply: () => setBeat("history") },
        { at: 2057, apply: () => setBeat("docs") },
        { at: 2571, apply: () => setBeat("notes") },
        { at: 3086, apply: () => setBeat("done") },
      ],
    });

    return clear;
  }, [active, reduced, seekKey, seekMs, finish, later, clear]);

  return (
    <div className="lp-hubClients__panel">
      <ClientsCopy />
      <ClientsBoard beat={beat} openId={openId} />
    </div>
  );
}

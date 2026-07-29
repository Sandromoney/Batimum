"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Building2,
  Check,
  FileText,
  HardHat,
  ImageIcon,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  Receipt,
  User,
  Users,
} from "lucide-react";

export const CLIENTS_HIGHLIGHT_MS = 900;
export const CLIENTS_ENTER_MS = 1750;
export const CLIENTS_RETURN_MS = 1700;
export const CLIENTS_DEMO_SAFETY_MS = 28000;

type ClientsBeat =
  | "list"
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
      <span className="lp-eyebrow">
        <span className="lp-eyebrow__dot" aria-hidden="true" />
        Clients
      </span>
      <h3 className="lp-hubClients__title">
        Toutes les infos client.
        <br />
        Au même endroit.
      </h3>
      <p className="lp-hubClients__subtitle">
        Coordonnées, devis, factures, chantiers.
        <br />
        Plus besoin de chercher ailleurs.
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
  const showFiche = beat !== "list";
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
  const showDocs =
    beat === "docs" || beat === "notes" || beat === "done";
  const showNotes = beat === "notes" || beat === "done";

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
              className={[
                "is-on",
                openId === c.id ? "is-selected" : "",
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
              <p className="lp-hubClients__blockLabel">Historique</p>
              <ul className="lp-hubClients__hist">
                <li className="is-on">
                  <FileText size={13} strokeWidth={1.8} />
                  <span>Devis — Salle de bain 18 m²</span>
                  <Check size={12} strokeWidth={2.4} className="is-ok" />
                </li>
                <li className="is-on">
                  <Receipt size={13} strokeWidth={1.8} />
                  <span>Facture FAC-2026-0142</span>
                  <span className="lp-hubClients__pill">Payée</span>
                </li>
                <li className="is-on">
                  <HardHat size={13} strokeWidth={1.8} />
                  <span>Chantier — Salle de bain</span>
                  <span className="lp-hubClients__pill">En cours</span>
                </li>
                <li className="is-on">
                  <Receipt size={13} strokeWidth={1.8} />
                  <span>Paiement reçu — 29 juil.</span>
                  <Check size={12} strokeWidth={2.4} className="is-ok" />
                </li>
              </ul>
            </div>
          ) : null}

          {showDocs ? (
            <div className="lp-hubClients__block is-on">
              <p className="lp-hubClients__blockLabel">Documents &amp; photos</p>
              <div className="lp-hubClients__docs">
                <span>
                  <FileText size={14} strokeWidth={1.8} />
                  Devis signé
                </span>
                <span>
                  <ImageIcon size={14} strokeWidth={1.8} />
                  Photos chantier
                </span>
              </div>
            </div>
          ) : null}

          {showNotes ? (
            <div className="lp-hubClients__block is-on">
              <p className="lp-hubClients__blockLabel">Notes internes</p>
              <p className="lp-hubClients__note">
                <NotebookPen size={13} strokeWidth={1.8} />
                Accès parking rue Garibaldi. Préférer WhatsApp pour les RDV.
              </p>
            </div>
          ) : null}

          {beat === "done" ? (
            <p className="lp-hubClients__calm">
              Une fiche. Toute l’activité client.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ClientsFilmPanel({
  active,
  reduced,
  onDemoComplete,
}: {
  active: boolean;
  reduced: boolean;
  onDemoComplete: () => void;
}) {
  const [beat, setBeat] = useState<ClientsBeat>("list");
  const [openId, setOpenId] = useState<string | null>(null);
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDemoComplete();
  }, [onDemoComplete]);

  useEffect(() => {
    clearTimers();
    finishedRef.current = false;
    setBeat("list");
    setOpenId(null);

    if (!active) return;

    if (reduced) {
      setOpenId("martin");
      setBeat("done");
      later(finish, 400);
      return clearTimers;
    }

    later(() => {
      setOpenId("martin");
      setBeat("open");
    }, 900);
    later(() => setBeat("identity"), 1600);
    later(() => setBeat("contact"), 2600);
    later(() => setBeat("history"), 3800);
    later(() => setBeat("docs"), 5600);
    later(() => setBeat("notes"), 7000);
    later(() => setBeat("done"), 8400);
    later(finish, 9800);

    return clearTimers;
  }, [active, reduced, finish]);

  return (
    <div className="lp-hubClients__panel">
      <ClientsCopy />
      <ClientsBoard beat={beat} openId={openId} />
    </div>
  );
}

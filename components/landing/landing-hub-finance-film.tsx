"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check, LineChart, Receipt } from "lucide-react";
import { animate, useMotionValue, useTransform } from "framer-motion";

export const FIN_HIGHLIGHT_MS = 1100;
export const FIN_ENTER_MS = 1600;
export const FIN_RETURN_MS = 1800;
export const FIN_DEMO_SAFETY_MS = 42000;

const DEVIS_TOTAL = 9845;

type FinBeat =
  | "devis"
  | "facture"
  | "paiement"
  | "dashboard"
  | "margeOk"
  | "margeLow"
  | "alive"
  | "done";

function formatEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function CountUp({
  active,
  from = 0,
  to,
  suffix = "",
  duration = 1.1,
  reduced,
}: {
  active: boolean;
  from?: number;
  to: number;
  suffix?: string;
  duration?: number;
  reduced: boolean;
}) {
  const mv = useMotionValue(from);
  const [label, setLabel] = useState(
    `${Math.round(from).toLocaleString("fr-FR")}${suffix}`,
  );

  useEffect(() => {
    if (!active) {
      mv.set(from);
      setLabel(`${Math.round(from).toLocaleString("fr-FR")}${suffix}`);
      return;
    }
    if (reduced) {
      mv.set(to);
      setLabel(`${Math.round(to).toLocaleString("fr-FR")}${suffix}`);
      return;
    }
    const controls = animate(mv, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    const unsub = mv.on("change", (v) => {
      setLabel(`${Math.round(v).toLocaleString("fr-FR")}${suffix}`);
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [active, from, to, suffix, duration, reduced, mv]);

  return <span className="lp-hubFin__num">{label}</span>;
}

function EuroCountUp({
  active,
  to,
  reduced,
  duration = 1.2,
}: {
  active: boolean;
  to: number;
  reduced: boolean;
  duration?: number;
}) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => formatEuro(Math.round(v)));
  const [label, setLabel] = useState(formatEuro(0));

  useEffect(() => display.on("change", setLabel), [display]);

  useEffect(() => {
    if (!active) {
      mv.set(0);
      setLabel(formatEuro(0));
      return;
    }
    if (reduced) {
      mv.set(to);
      setLabel(formatEuro(to));
      return;
    }
    const controls = animate(mv, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [active, to, reduced, duration, mv]);

  return <span className="lp-hubFin__num">{label}</span>;
}

function FinanceCopy() {
  return (
    <div className="lp-hubFin__copy">
      <span className="lp-eyebrow">
        <span className="lp-eyebrow__dot" aria-hidden="true" />
        Facturation &amp; Pilotage
      </span>
      <h3 className="lp-hubFin__title">
        De votre devis…
        <br />
        jusqu’à votre rentabilité.
      </h3>
      <p className="lp-hubFin__subtitle">
        Une action entraîne la suivante.
        <br />
        Tout se met à jour automatiquement.
      </p>
    </div>
  );
}

function FinanceBoard({
  beat,
  devisStep,
  invoiceStep,
  payStep,
  dashOn,
  breathe,
  reduced,
}: {
  beat: FinBeat;
  devisStep: number;
  invoiceStep: number;
  payStep: number;
  dashOn: boolean;
  breathe: boolean;
  reduced: boolean;
}) {
  const devisStatus =
    devisStep >= 2 ? "Signé" : devisStep >= 1 ? "Envoyé" : "Brouillon";
  const payStatus =
    payStep >= 2 ? "Payée" : payStep >= 1 ? "En attente" : "Envoyée";

  return (
    <div
      className={[
        "lp-hubFin__ui",
        breathe ? "is-breathe" : "",
        dashOn ? "is-dash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <div className="lp-hubFin__uiHead">
        <Receipt size={15} strokeWidth={1.75} />
        <span>Salle de bain · Famille Martin</span>
        <LineChart size={15} strokeWidth={1.75} className="lp-hubFin__uiHeadAlt" />
      </div>

      {/* Scène 1 — devis */}
      <div
        className={[
          "lp-hubFin__card",
          "lp-hubFin__devis",
          beat !== "devis" && devisStep >= 2 ? "is-compact" : "",
          devisStep >= 0 ? "is-on" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="lp-hubFin__row">
          <div>
            <p className="lp-hubFin__label">Devis MUM IA</p>
            <p className="lp-hubFin__name">Salle de bain — 6 m²</p>
          </div>
          <div
            className={[
              "lp-hubFin__pill",
              devisStep >= 2 ? "is-ok" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {devisStatus}
            {devisStep >= 2 ? <Check size={12} strokeWidth={2.4} /> : null}
          </div>
        </div>
        <p className="lp-hubFin__amount">{formatEuro(DEVIS_TOTAL)} HT</p>
      </div>

      {/* Scène 2 — facture */}
      {(invoiceStep > 0 ||
        beat === "facture" ||
        beat === "paiement" ||
        dashOn) && (
        <div
          className={[
            "lp-hubFin__card",
            "lp-hubFin__invoice",
            invoiceStep > 0 ? "is-on" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="lp-hubFin__label">
            {invoiceStep < 4 ? "Création de la facture…" : "Facture"}
          </p>
          <ul className="lp-hubFin__meta">
            <li className={invoiceStep >= 1 ? "is-on" : undefined}>
              <span>Numéro</span>
              <strong>FAC-2026-0142</strong>
            </li>
            <li className={invoiceStep >= 2 ? "is-on" : undefined}>
              <span>Date</span>
              <strong>29 juil. 2026</strong>
            </li>
            <li className={invoiceStep >= 3 ? "is-on" : undefined}>
              <span>Montant</span>
              <strong>{formatEuro(DEVIS_TOTAL)} HT</strong>
            </li>
          </ul>
        </div>
      )}

      {/* Scène 3 — paiement */}
      {(payStep > 0 ||
        beat === "paiement" ||
        dashOn) && (
        <div
          className={[
            "lp-hubFin__card",
            "lp-hubFin__pay",
            payStep > 0 ? "is-on" : "",
            payStep >= 2 ? "is-paid" : "",
            payStep >= 1 && payStep < 2 ? "is-send" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="lp-hubFin__row">
            <p className="lp-hubFin__label">Suivi paiement</p>
            <div
              className={[
                "lp-hubFin__pill",
                payStep >= 2 ? "is-ok" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {payStatus}
              {payStep >= 2 ? <Check size={12} strokeWidth={2.4} /> : null}
            </div>
          </div>
          {payStep >= 1 ? (
            <div className="lp-hubFin__sendTrail" aria-hidden="true" />
          ) : null}
        </div>
      )}

      {/* Dashboard vivant */}
      {dashOn ? (
        <div className="lp-hubFin__dash">
          <div className="lp-hubFin__kpis">
            <article className="lp-hubFin__kpi is-on">
              <p className="lp-hubFin__kpiLabel">CA mensuel</p>
              <p className="lp-hubFin__kpiValue">
                <EuroCountUp
                  active={dashOn}
                  to={42860}
                  reduced={reduced}
                  duration={1.4}
                />
              </p>
            </article>
            <article className="lp-hubFin__kpi is-on">
              <p className="lp-hubFin__kpiLabel">Factures payées</p>
              <p className="lp-hubFin__kpiValue">
                <CountUp active={dashOn} from={11} to={12} reduced={reduced} />
              </p>
            </article>
            <article className="lp-hubFin__kpi is-on">
              <p className="lp-hubFin__kpiLabel">Chantiers terminés</p>
              <p className="lp-hubFin__kpiValue">
                <CountUp active={dashOn} from={7} to={8} reduced={reduced} />
              </p>
            </article>
            <article className="lp-hubFin__kpi is-on">
              <p className="lp-hubFin__kpiLabel">Rentabilité</p>
              <p className="lp-hubFin__kpiValue">
                <CountUp
                  active={dashOn}
                  from={18}
                  to={22}
                  suffix=" %"
                  reduced={reduced}
                />
              </p>
            </article>
          </div>

          <div className="lp-hubFin__chart is-on" aria-hidden="true">
            <span style={{ "--h": "42%" } as CSSProperties} />
            <span style={{ "--h": "55%" } as CSSProperties} />
            <span style={{ "--h": "48%" } as CSSProperties} />
            <span style={{ "--h": "68%" } as CSSProperties} />
            <span style={{ "--h": "74%" } as CSSProperties} />
            <span className="is-live" style={{ "--h": "86%" } as CSSProperties} />
          </div>

          {/* Scène 4 — marge OK */}
          {(beat === "margeOk" ||
            beat === "margeLow" ||
            beat === "alive" ||
            beat === "done") && (
            <article className="lp-hubFin__marge is-on">
              <p className="lp-hubFin__label">Rentabilité du chantier</p>
              <p className="lp-hubFin__name">Salle de bain</p>
              <ul className="lp-hubFin__margeRows">
                <li>
                  <span>Coût prévu</span>
                  <strong>{formatEuro(7200)}</strong>
                </li>
                <li>
                  <span>Coût réel</span>
                  <strong>{formatEuro(7050)}</strong>
                </li>
                <li>
                  <span>Marge</span>
                  <strong>{formatEuro(2795)}</strong>
                </li>
              </ul>
              <p className="lp-hubFin__hint is-ok">
                Marge conforme aux prévisions.
              </p>
            </article>
          )}

          {/* Scène 5 — marge basse */}
          {(beat === "margeLow" || beat === "alive" || beat === "done") && (
            <article className="lp-hubFin__marge is-on is-soft">
              <p className="lp-hubFin__label">Rentabilité du chantier</p>
              <p className="lp-hubFin__name">Cuisine — M. Bernard</p>
              <ul className="lp-hubFin__margeRows">
                <li>
                  <span>Coût prévu</span>
                  <strong>{formatEuro(5100)}</strong>
                </li>
                <li>
                  <span>Coût réel</span>
                  <strong>{formatEuro(5480)}</strong>
                </li>
                <li>
                  <span>Marge</span>
                  <strong>{formatEuro(920)}</strong>
                </li>
              </ul>
              <p className="lp-hubFin__hint is-warn">
                Marge inférieure aux prévisions.
              </p>
            </article>
          )}
        </div>
      ) : null}

      {beat === "alive" || beat === "done" ? (
        <p className="lp-hubFin__calm">Tout est connecté.</p>
      ) : null}
    </div>
  );
}

export function FinanceFilmPanel({
  active,
  reduced,
  onDemoComplete,
}: {
  active: boolean;
  reduced: boolean;
  onDemoComplete: () => void;
}) {
  const [beat, setBeat] = useState<FinBeat>("devis");
  const [devisStep, setDevisStep] = useState(0);
  const [invoiceStep, setInvoiceStep] = useState(0);
  const [payStep, setPayStep] = useState(0);
  const [dashOn, setDashOn] = useState(false);
  const [breathe, setBreathe] = useState(false);
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
    setBeat("devis");
    setDevisStep(0);
    setInvoiceStep(0);
    setPayStep(0);
    setDashOn(false);
    setBreathe(false);

    if (!active) return;

    if (reduced) {
      setDevisStep(2);
      setInvoiceStep(4);
      setPayStep(2);
      setDashOn(true);
      setBeat("done");
      later(finish, 500);
      return clearTimers;
    }

    // Scène 1 — devis
    later(() => setDevisStep(0), 200);
    later(() => setDevisStep(1), 900);
    later(() => setDevisStep(2), 1700);

    // Scène 2 — facture
    later(() => {
      setBeat("facture");
      setInvoiceStep(1);
    }, 2400);
    later(() => setInvoiceStep(2), 2900);
    later(() => setInvoiceStep(3), 3400);
    later(() => setInvoiceStep(4), 3900);

    // Scène 3 — paiement
    later(() => {
      setBeat("paiement");
      setPayStep(0);
    }, 4500);
    later(() => setPayStep(1), 5100);
    later(() => setPayStep(2), 6200);
    later(() => setBreathe(true), 6400);

    // Dashboard s’éveille
    later(() => {
      setBeat("dashboard");
      setDashOn(true);
    }, 7200);

    // Scène 4 — marge OK
    later(() => setBeat("margeOk"), 9200);

    // Scène 5 — marge basse
    later(() => setBeat("margeLow"), 11200);

    // Scène 6 — vivant
    later(() => setBeat("alive"), 13200);
    later(() => setBeat("done"), 14800);
    later(finish, 16200);

    return clearTimers;
  }, [active, reduced, finish]);

  return (
    <div className="lp-hubFin__panel">
      <FinanceCopy />
      <FinanceBoard
        beat={beat}
        devisStep={devisStep}
        invoiceStep={invoiceStep}
        payStep={payStep}
        dashOn={dashOn}
        breathe={breathe}
        reduced={!!reduced}
      />
    </div>
  );
}

export function FinanceFilmShell({
  phase,
  children,
}: {
  phase:
    | "idle"
    | "highlight"
    | "enter"
    | "demo"
    | "hold"
    | "returning"
    | "tease";
  children: ReactNode;
}) {
  const open =
    phase === "enter" ||
    phase === "demo" ||
    phase === "hold" ||
    phase === "returning";

  return (
    <div
      className={[
        "lp-hubFin",
        open ? "is-open" : "",
        phase === "enter" ? "is-entering" : "",
        phase === "demo" || phase === "hold" ? "is-inside" : "",
        phase === "returning" ? "is-returning" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!open}
    >
      <div className="lp-hubFin__frame">{children}</div>
    </div>
  );
}

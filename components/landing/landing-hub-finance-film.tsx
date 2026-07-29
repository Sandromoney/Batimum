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
import { animate, useMotionValue } from "framer-motion";

export const FIN_HIGHLIGHT_MS = 1100;
export const FIN_ENTER_MS = 1600;
export const FIN_RETURN_MS = 1800;
export const FIN_CONVERGE_MS = 2200;
export const FIN_DEMO_SAFETY_MS = 45000;

const DEVIS_TOTAL = 9845;
const CA_STEPS = [24860, 26140, 29580, 32940] as const;
const MARGIN_STEPS = [22, 24, 27] as const;

type FinBeat =
  | "devis"
  | "pipeline"
  | "send"
  | "pay"
  | "pulse"
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

function StepEuro({
  active,
  steps,
  reduced,
  duration = 0.7,
}: {
  active: boolean;
  steps: readonly number[];
  reduced: boolean;
  duration?: number;
}) {
  const mv = useMotionValue(steps[0]);
  const [label, setLabel] = useState(formatEuro(steps[0]));

  useEffect(() => {
    const unsub = mv.on("change", (v) => setLabel(formatEuro(Math.round(v))));
    return unsub;
  }, [mv]);

  useEffect(() => {
    if (!active) {
      mv.set(steps[0]);
      setLabel(formatEuro(steps[0]));
      return;
    }
    if (reduced) {
      const last = steps[steps.length - 1];
      mv.set(last);
      setLabel(formatEuro(last));
      return;
    }

    let cancelled = false;
    const run = async () => {
      for (let i = 1; i < steps.length; i++) {
        if (cancelled) return;
        await new Promise<void>((resolve) => {
          const c = animate(mv, steps[i], {
            duration,
            ease: [0.22, 1, 0.36, 1],
            onComplete: () => resolve(),
          });
          if (cancelled) c.stop();
        });
        await new Promise((r) => setTimeout(r, 160));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [active, steps, reduced, duration, mv]);

  return <span className="lp-hubFin__num">{label}</span>;
}

function StepPercent({
  active,
  steps,
  reduced,
}: {
  active: boolean;
  steps: readonly number[];
  reduced: boolean;
}) {
  const mv = useMotionValue(steps[0]);
  const [label, setLabel] = useState(`${steps[0]} %`);

  useEffect(() => {
    const unsub = mv.on("change", (v) => setLabel(`${Math.round(v)} %`));
    return unsub;
  }, [mv]);

  useEffect(() => {
    if (!active) {
      mv.set(steps[0]);
      setLabel(`${steps[0]} %`);
      return;
    }
    if (reduced) {
      const last = steps[steps.length - 1];
      mv.set(last);
      setLabel(`${last} %`);
      return;
    }
    let cancelled = false;
    const run = async () => {
      for (let i = 1; i < steps.length; i++) {
        if (cancelled) return;
        await new Promise<void>((resolve) => {
          const c = animate(mv, steps[i], {
            duration: 0.65,
            ease: [0.22, 1, 0.36, 1],
            onComplete: () => resolve(),
          });
          if (cancelled) c.stop();
        });
        await new Promise((r) => setTimeout(r, 140));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [active, steps, reduced, mv]);

  return <span className="lp-hubFin__num">{label}</span>;
}

function CountUp({
  active,
  from,
  to,
  reduced,
}: {
  active: boolean;
  from: number;
  to: number;
  reduced: boolean;
}) {
  const mv = useMotionValue(from);
  const [label, setLabel] = useState(String(from));

  useEffect(() => {
    const unsub = mv.on("change", (v) => setLabel(String(Math.round(v))));
    return unsub;
  }, [mv]);

  useEffect(() => {
    if (!active) {
      mv.set(from);
      setLabel(String(from));
      return;
    }
    if (reduced) {
      mv.set(to);
      setLabel(String(to));
      return;
    }
    const c = animate(mv, to, { duration: 1.05, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [active, from, to, reduced, mv]);

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
        Pilotez votre entreprise
        <br />
        en temps réel.
      </h3>
      <p className="lp-hubFin__subtitle">
        Voyez votre activité.
        <br />
        Voyez vos marges.
        <br />
        En un coup d’œil.
      </p>
    </div>
  );
}

function FinanceBoard({
  beat,
  pipelineOn,
  invoiceOn,
  sendPressed,
  payStep,
  dashOn,
  breathe,
  reduced,
}: {
  beat: FinBeat;
  pipelineOn: boolean;
  invoiceOn: boolean;
  sendPressed: boolean;
  payStep: number;
  dashOn: boolean;
  breathe: boolean;
  reduced: boolean;
}) {
  const payLabel =
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

      {/* Scène 1 — devis signé */}
      <div className="lp-hubFin__card lp-hubFin__devis is-on">
        <div className="lp-hubFin__row">
          <div>
            <p className="lp-hubFin__label">Devis MUM IA</p>
            <p className="lp-hubFin__name">Salle de bain — 6 m²</p>
          </div>
          <div className="lp-hubFin__pill is-ok">
            Signé
            <Check size={12} strokeWidth={2.4} />
          </div>
        </div>
        <p className="lp-hubFin__amount">{formatEuro(DEVIS_TOTAL)} HT</p>
      </div>

      {/* Scène 2 — pipeline devis → facture */}
      {pipelineOn ? (
        <div className="lp-hubFin__pipeline is-on">
          <span className="is-done">Devis</span>
          <span className="lp-hubFin__pipe" aria-hidden="true" />
          <span className={invoiceOn ? "is-done" : "is-next"}>Facture</span>
        </div>
      ) : null}

      {invoiceOn ? (
        <div className="lp-hubFin__card lp-hubFin__invoice is-on">
          <p className="lp-hubFin__label">Facture créée automatiquement</p>
          <ul className="lp-hubFin__meta">
            <li className="is-on">
              <span>Numéro</span>
              <strong>FAC-2026-0142</strong>
            </li>
            <li className="is-on">
              <span>Date</span>
              <strong>29 juil. 2026</strong>
            </li>
            <li className="is-on">
              <span>Montant</span>
              <strong>{formatEuro(DEVIS_TOTAL)} HT</strong>
            </li>
          </ul>

          <button
            type="button"
            className={[
              "lp-hubFin__send",
              sendPressed ? "is-pressed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            tabIndex={-1}
          >
            Envoyer
          </button>
        </div>
      ) : null}

      {/* Scène 3–4 — envoi + paiement */}
      {(beat === "send" ||
        beat === "pay" ||
        beat === "pulse" ||
        dashOn) &&
      sendPressed ? (
        <div
          className={[
            "lp-hubFin__card",
            "lp-hubFin__pay",
            "is-on",
            payStep >= 2 ? "is-paid" : "",
            payStep === 0 ? "is-send" : "",
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
              {payLabel}
              {payStep >= 2 ? <Check size={12} strokeWidth={2.4} /> : null}
            </div>
          </div>
          {payStep === 0 ? (
            <div className="lp-hubFin__sendTrail" aria-hidden="true" />
          ) : null}
        </div>
      ) : null}

      {/* Scène 5+ — dashboard */}
      {dashOn ? (
        <div className="lp-hubFin__dash">
          <div className="lp-hubFin__kpis">
            <article className="lp-hubFin__kpi is-on">
              <p className="lp-hubFin__kpiLabel">CA mensuel</p>
              <p className="lp-hubFin__kpiValue">
                <StepEuro active={dashOn} steps={CA_STEPS} reduced={reduced} />
              </p>
            </article>
            <article className="lp-hubFin__kpi is-on">
              <p className="lp-hubFin__kpiLabel">Rentabilité</p>
              <p className="lp-hubFin__kpiValue">
                <StepPercent
                  active={dashOn}
                  steps={MARGIN_STEPS}
                  reduced={reduced}
                />
              </p>
            </article>
            <article className="lp-hubFin__kpi is-on">
              <p className="lp-hubFin__kpiLabel">Devis signés</p>
              <p className="lp-hubFin__kpiValue">
                <CountUp active={dashOn} from={14} to={15} reduced={reduced} />
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
          </div>

          <div className="lp-hubFin__chart is-on" aria-hidden="true">
            <svg viewBox="0 0 240 72" className="lp-hubFin__curve">
              <path
                className="lp-hubFin__curveLine"
                d="M8 58 C 40 54, 55 48, 78 42 S 120 28, 150 24 S 200 14, 232 10"
              />
            </svg>
          </div>

          {(beat === "margeOk" ||
            beat === "margeLow" ||
            beat === "alive" ||
            beat === "done") && (
            <article className="lp-hubFin__marge is-on">
              <p className="lp-hubFin__label">Rentabilité chantier</p>
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
              <p className="lp-hubFin__hint is-ok">Chantier rentable.</p>
            </article>
          )}

          {(beat === "margeLow" || beat === "alive" || beat === "done") && (
            <article className="lp-hubFin__marge is-on is-soft">
              <p className="lp-hubFin__label">Rentabilité chantier</p>
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
        <p className="lp-hubFin__calm">Votre entreprise, en un coup d’œil.</p>
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
  const [pipelineOn, setPipelineOn] = useState(false);
  const [invoiceOn, setInvoiceOn] = useState(false);
  const [sendPressed, setSendPressed] = useState(false);
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
    setPipelineOn(false);
    setInvoiceOn(false);
    setSendPressed(false);
    setPayStep(0);
    setDashOn(false);
    setBreathe(false);

    if (!active) return;

    if (reduced) {
      setPipelineOn(true);
      setInvoiceOn(true);
      setSendPressed(true);
      setPayStep(2);
      setDashOn(true);
      setBeat("done");
      later(finish, 500);
      return clearTimers;
    }

    // 1 — devis signé (déjà visible)
    // 2 — pipeline + facture
    later(() => {
      setBeat("pipeline");
      setPipelineOn(true);
    }, 700);
    later(() => setInvoiceOn(true), 1300);

    // 3 — envoyer
    later(() => {
      setBeat("send");
      setSendPressed(true);
    }, 2400);

    // 4 — statuts paiement
    later(() => {
      setBeat("pay");
      setPayStep(0);
    }, 3100);
    later(() => setPayStep(1), 3900);
    later(() => setPayStep(2), 4800);

    // 5 — respiration + dashboard
    later(() => {
      setBeat("pulse");
      setBreathe(true);
      setDashOn(true);
    }, 5400);

    // 6 — marge OK
    later(() => setBeat("margeOk"), 7800);

    // 7 — marge basse
    later(() => setBeat("margeLow"), 9800);

    // 8 — vivant + silence
    later(() => setBeat("alive"), 11800);
    later(() => setBeat("done"), 13800);
    later(finish, 15500);

    return clearTimers;
  }, [active, reduced, finish]);

  return (
    <div className="lp-hubFin__panel">
      <FinanceCopy />
      <FinanceBoard
        beat={beat}
        pipelineOn={pipelineOn}
        invoiceOn={invoiceOn}
        sendPressed={sendPressed}
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
    | "tease"
    | "converge";
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

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Bot, Check } from "lucide-react";
import { animate, useMotionValue, useTransform } from "framer-motion";

const PROMPT =
  "Création d'une salle de bain complète de 6 m² avec remplacement douche, meuble vasque, faïence, plomberie.";

const ANALYSIS = ["Quantités", "Matériaux", "Temps", "Prix"] as const;

const LINES = [
  { label: "Protection chantier", amount: 180 },
  { label: "Dépose", amount: 620 },
  { label: "Plomberie", amount: 2140 },
  { label: "Faïence", amount: 1680 },
  { label: "Carrelage", amount: 1320 },
  { label: "Main d’œuvre", amount: 2460 },
  { label: "Fournitures", amount: 1445 },
] as const;

const TOTAL_STEPS = [0, 1500, 3900, 6120, 9845] as const;

export type MumFilmPhase =
  | "idle"
  | "highlight"
  | "enter"
  | "demo"
  | "hold"
  | "returning";

type DemoBeat =
  | "empty"
  | "typing"
  | "pause"
  | "analyse"
  | "lines"
  | "total"
  | "ready";

function formatEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function TotalCounter({
  active,
  reduced,
  onDone,
}: {
  active: boolean;
  reduced: boolean;
  onDone: () => void;
}) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => {
    const n = Math.round(v);
    const suffix = n >= TOTAL_STEPS[TOTAL_STEPS.length - 1] ? " HT" : "";
    return `${formatEuro(n)}${suffix}`;
  });
  const [label, setLabel] = useState("0 €");
  const doneRef = useRef(false);

  useEffect(() => display.on("change", (v) => setLabel(v)), [display]);

  useEffect(() => {
    doneRef.current = false;
    if (!active) {
      mv.set(0);
      setLabel("0 €");
      return;
    }

    if (reduced) {
      const final = TOTAL_STEPS[TOTAL_STEPS.length - 1];
      mv.set(final);
      setLabel(`${formatEuro(final)} HT`);
      doneRef.current = true;
      onDone();
      return;
    }

    let cancelled = false;

    const run = async () => {
      for (let step = 0; step < TOTAL_STEPS.length; step++) {
        if (cancelled) return;
        const target = TOTAL_STEPS[step];
        await new Promise<void>((resolve) => {
          const controls = animate(mv, target, {
            duration: step === 0 ? 0.15 : 0.55,
            ease: [0.22, 1, 0.36, 1],
            onComplete: () => resolve(),
          });
          if (cancelled) controls.stop();
        });
        if (step < TOTAL_STEPS.length - 1) {
          await new Promise((r) => setTimeout(r, 160));
        }
      }
      if (!cancelled && !doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [active, reduced, mv, onDone]);

  return <span className="lp-hubMum__totalValue">{label}</span>;
}

function MumInterface({
  beat,
  typed,
  analyseDone,
  linesVisible,
  showReady,
  caretOn,
  reduced,
  onTotalDone,
}: {
  beat: DemoBeat;
  typed: string;
  analyseDone: number;
  linesVisible: number;
  showReady: boolean;
  caretOn: boolean;
  reduced: boolean;
  onTotalDone: () => void;
}) {
  const showAnalyse =
    beat === "analyse" ||
    beat === "lines" ||
    beat === "total" ||
    beat === "ready";
  const showLines =
    beat === "lines" || beat === "total" || beat === "ready";
  const showTotal = beat === "total" || beat === "ready";

  return (
    <div className="lp-hubMum__ui" aria-hidden="true">
      <div className="lp-hubMum__uiHead">
        <Bot size={15} strokeWidth={1.75} />
        <span>MUM IA · préparation du devis</span>
      </div>

      <div className="lp-hubMum__composer">
        <p className="lp-hubMum__composerLabel">Demande client</p>
        <div className="lp-hubMum__composerBox">
          <p className="lp-hubMum__composerText">
            {typed}
            {caretOn ? <span className="lp-hubMum__caret" /> : null}
          </p>
        </div>
      </div>

      {showAnalyse ? (
        <div className="lp-hubMum__analyse">
          <p className="lp-hubMum__composerLabel">Analyse</p>
          <ul className="lp-hubMum__analyseList">
            {ANALYSIS.map((item, i) => {
              const done = i < analyseDone;
              return (
                <li key={item} className={done ? "is-done" : undefined}>
                  <span className="lp-hubMum__analyseMark" aria-hidden="true">
                    {done ? <Check size={13} strokeWidth={2.4} /> : null}
                  </span>
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {showLines ? (
        <div className="lp-hubMum__devis">
          <p className="lp-hubMum__composerLabel">Devis</p>
          <ul className="lp-hubMum__lines">
            {LINES.map((line, i) => (
              <li
                key={line.label}
                className={i < linesVisible ? "is-on" : undefined}
              >
                <span>{line.label}</span>
                <span className="lp-hubMum__lineAmt">
                  {formatEuro(line.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showTotal ? (
        <div className="lp-hubMum__total">
          <span className="lp-hubMum__totalLabel">Total</span>
          <TotalCounter
            active={beat === "total" || beat === "ready"}
            reduced={reduced}
            onDone={onTotalDone}
          />
        </div>
      ) : null}

      {showReady ? (
        <div className="lp-hubMum__ready is-on">
          <span className="lp-hubMum__readyCheck" aria-hidden="true">
            <Check size={14} strokeWidth={2.4} />
          </span>
          <span>Votre devis est prêt.</span>
        </div>
      ) : null}
    </div>
  );
}

function MumFilmCopy() {
  return (
    <div className="lp-hubMum__copy">
      <span className="lp-eyebrow">
        <span className="lp-eyebrow__dot" aria-hidden="true" />
        MUM IA
      </span>
      <h3 className="lp-hubMum__title">
        Créez un devis professionnel
        <br />
        en quelques minutes.
      </h3>
      <p className="lp-hubMum__subtitle">
        Décrivez les travaux. MUM IA structure le devis.
        <br />
        Vous vérifiez. Vous envoyez.
      </p>
    </div>
  );
}

export function MumFilmPanel({
  active,
  reduced,
  onDemoComplete,
}: {
  active: boolean;
  reduced: boolean;
  onDemoComplete: () => void;
}) {
  const [beat, setBeat] = useState<DemoBeat>("empty");
  const [typed, setTyped] = useState("");
  const [analyseDone, setAnalyseDone] = useState(0);
  const [linesVisible, setLinesVisible] = useState(0);
  const [showReady, setShowReady] = useState(false);
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
    setBeat("empty");
    setTyped("");
    setAnalyseDone(0);
    setLinesVisible(0);
    setShowReady(false);

    if (!active) return;

    if (reduced) {
      setTyped(PROMPT);
      setAnalyseDone(ANALYSIS.length);
      setLinesVisible(LINES.length);
      setBeat("ready");
      setShowReady(true);
      later(finish, 500);
      return clearTimers;
    }

    // Curseur seul, puis frappe
    later(() => setBeat("typing"), 400);

    return clearTimers;
  }, [active, reduced, finish]);

  // Typewriter
  useEffect(() => {
    if (beat !== "typing" || reduced) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      i += 1;
      setTyped(PROMPT.slice(0, i));
      if (i >= PROMPT.length) {
        setBeat("pause");
        later(() => setBeat("analyse"), 560);
        return;
      }
      const ch = PROMPT[i - 1];
      const delay =
        ch === " " ? 26 : ch === "," || ch === "." ? 85 : 20 + Math.random() * 16;
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, 120);
    return () => clearTimeout(timer);
  }, [beat, reduced]);

  // Analyse lines
  useEffect(() => {
    if (beat !== "analyse" || reduced) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setAnalyseDone(n);
      if (n >= ANALYSIS.length) {
        clearInterval(id);
        later(() => setBeat("lines"), 480);
      }
    }, 500);
    return () => clearInterval(id);
  }, [beat, reduced]);

  // Devis lines
  useEffect(() => {
    if (beat !== "lines" || reduced) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setLinesVisible(n);
      if (n >= LINES.length) {
        clearInterval(id);
        later(() => setBeat("total"), 420);
      }
    }, 360);
    return () => clearInterval(id);
  }, [beat, reduced]);

  const onTotalDone = useCallback(() => {
    setBeat("ready");
    setShowReady(true);
    later(finish, 900);
  }, [finish]);

  return (
    <div className="lp-hubMum__panel">
      <MumFilmCopy />
      <MumInterface
        beat={beat}
        typed={typed}
        analyseDone={analyseDone}
        linesVisible={linesVisible}
        showReady={showReady}
        caretOn={beat === "empty" || beat === "typing"}
        reduced={!!reduced}
        onTotalDone={onTotalDone}
      />
    </div>
  );
}

export function MumFilmShell({
  phase,
  children,
}: {
  phase: MumFilmPhase;
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
        "lp-hubMum",
        open ? "is-open" : "",
        phase === "enter" ? "is-entering" : "",
        phase === "demo" || phase === "hold" ? "is-inside" : "",
        phase === "returning" ? "is-returning" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!open}
    >
      <div className="lp-hubMum__frame">{children}</div>
    </div>
  );
}

/** Durées de la scène film MUM (ms) — hors frappe/devis gérés en interne */
export const MUM_HIGHLIGHT_MS = 1100;
export const MUM_ENTER_MS = 1600;
export const MUM_RETURN_MS = 1800;
/** Plafond de sécurité si la démo ne signale pas la fin */
export const MUM_DEMO_SAFETY_MS = 28000;

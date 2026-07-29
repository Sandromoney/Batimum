"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Bot, Check, Mic, Sparkles } from "lucide-react";
import {
  MumSignJourney,
  type MumSignBeat,
} from "@/components/landing/landing-hub-mum-sign-overlay";

const PROMPT =
  "Création d'une salle de bain complète de 18 m² avec remplacement de la douche existante par une douche à l'italienne 120 × 90 cm, meuble double vasque de 120 cm, faïence murale 30 × 60 sur 42 m², carrelage au sol 18 m², création des alimentations PER, remplacement des évacuations PVC, pose d'un sèche-serviettes et peinture du plafond.";

const PROMPT_WORDS = PROMPT.split(/(\s+)/).filter(Boolean);

const ANALYSIS = ["Quantités", "Matériaux", "Temps", "Structure"] as const;

/** Lignes dérivées strictement de la dictée — aucune donnée inventée. */
const LINES = [
  { label: "Dépose douche existante", qty: "1 u." },
  { label: "Douche à l'italienne 120 × 90 cm", qty: "1 u." },
  { label: "Meuble double vasque 120 cm", qty: "1 u." },
  { label: "Faïence murale 30 × 60", qty: "42 m²" },
  { label: "Carrelage sol", qty: "18 m²" },
  { label: "Alimentations PER", qty: "1 forfait" },
  { label: "Évacuations PVC", qty: "1 forfait" },
  { label: "Sèche-serviettes", qty: "1 u." },
  { label: "Peinture plafond", qty: "18 m²" },
] as const;

const PRICE_MASK = "···";

export type MumFilmPhase =
  | "idle"
  | "highlight"
  | "enter"
  | "demo"
  | "hold"
  | "returning"
  | "tease"
  | "converge"
  | "signature"
  | "sealed";

type DemoBeat =
  | "empty"
  | "listen"
  | "speak"
  | "pause"
  | "analyse"
  | "lines"
  | "total"
  | "ready"
  | "signflow";

function MicWaves({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "lp-hubMum__micWaves",
        active ? "is-on" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
    </span>
  );
}

function MumInterface({
  beat,
  typed,
  analyseDone,
  linesVisible,
  showReady,
  listening,
  devisStatut,
}: {
  beat: DemoBeat;
  typed: string;
  analyseDone: number;
  linesVisible: number;
  showReady: boolean;
  listening: boolean;
  devisStatut: "ready" | "envoye" | "signe" | null;
}) {
  const showAnalyse =
    beat === "analyse" ||
    beat === "lines" ||
    beat === "total" ||
    beat === "ready";
  const showLines =
    beat === "lines" || beat === "total" || beat === "ready";
  const showTotal = beat === "total" || beat === "ready";
  const showPreview =
    showAnalyse || showLines || showTotal || showReady;

  return (
    <div className="lp-hubMum__ui" aria-hidden="true">
      <div className="lp-hubMum__uiHead">
        <span className="lp-hubMum__uiBadge">
          <Sparkles size={13} strokeWidth={1.9} />
          MUM IA
        </span>
        {devisStatut === "signe" ? (
          <span className="lp-hubMum__statut is-signe">
            Signé
            <Check size={11} strokeWidth={2.6} />
          </span>
        ) : devisStatut === "envoye" ? (
          <span className="lp-hubMum__statut is-envoye">Envoyé</span>
        ) : (
          <span className="lp-hubMum__uiHeadMeta">Préparation du devis</span>
        )}
      </div>

      <div className="lp-hubMum__composer">
        <p className="lp-hubMum__composerLabel">Décrivez votre chantier</p>
        <div
          className={[
            "lp-hubMum__composerRow",
            listening ? "is-listening" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="lp-hubMum__composerBox">
            <p
              className={[
                "lp-hubMum__composerText",
                !typed && listening ? "is-placeholder" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {typed || (listening ? "Écoute…" : "")}
            </p>
          </div>

          <div className="lp-hubMum__micWrap">
            <MicWaves active={listening} />
            <button
              type="button"
              className={[
                "lp-hubMum__mic",
                listening ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              tabIndex={-1}
              aria-hidden="true"
            >
              <Mic size={16} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </div>

      {showPreview ? (
        <div className="lp-hubMum__preview">
          <div className="lp-hubMum__previewHead">
            <Bot size={14} strokeWidth={1.8} />
            <span>Prévisualisation</span>
          </div>

          {showAnalyse ? (
            <div className="lp-hubMum__analyse">
              <ul className="lp-hubMum__analyseList">
                {ANALYSIS.map((item, i) => {
                  const done = i < analyseDone;
                  return (
                    <li key={item} className={done ? "is-done" : undefined}>
                      <span
                        className="lp-hubMum__analyseMark"
                        aria-hidden="true"
                      >
                        {done ? <Check size={12} strokeWidth={2.4} /> : null}
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
              <p className="lp-hubMum__sectionTitle">Salle de bain · 18 m²</p>
              <ul className="lp-hubMum__lines">
                {LINES.map((line, i) => (
                  <li
                    key={line.label}
                    className={i < linesVisible ? "is-on" : undefined}
                  >
                    <div className="lp-hubMum__lineMain">
                      <span className="lp-hubMum__lineLabel">{line.label}</span>
                      <span className="lp-hubMum__lineQty">{line.qty}</span>
                    </div>
                    <span className="lp-hubMum__lineAmt" aria-hidden="true">
                      {PRICE_MASK}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {showTotal ? (
            <div className="lp-hubMum__total is-on">
              <span className="lp-hubMum__totalLabel">Total général estimé</span>
              <span className="lp-hubMum__totalValue" aria-hidden="true">
                {PRICE_MASK}
                <span className="lp-hubMum__totalUnit"> HT</span>
              </span>
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
      ) : null}
    </div>
  );
}

function MumFilmCopy({ signing }: { signing: boolean }) {
  return (
    <div className="lp-hubMum__copy">
      <span className="lp-eyebrow">
        <span className="lp-eyebrow__dot" aria-hidden="true" />
        MUM IA
      </span>
      <h3 className="lp-hubMum__title">
        {signing ? (
          <>
            Envoyez.
            <br />
            Le client signe.
          </>
        ) : (
          <>
            Créez un devis professionnel
            <br />
            en quelques minutes.
          </>
        )}
      </h3>
      <p className="lp-hubMum__subtitle">
        {signing ? (
          <>
            Signature électronique.
            <br />
            Le statut se met à jour seul.
          </>
        ) : (
          <>
            Décrivez les travaux. Ou dictez-les.
            <br />
            MUM IA structure le devis.
          </>
        )}
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
  const [signBeat, setSignBeat] = useState<MumSignBeat>("idle");
  const [devisStatut, setDevisStatut] = useState<
    "ready" | "envoye" | "signe" | null
  >(null);
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

  const listening = beat === "listen" || beat === "speak";

  useEffect(() => {
    clearTimers();
    finishedRef.current = false;
    setBeat("empty");
    setTyped("");
    setAnalyseDone(0);
    setLinesVisible(0);
    setShowReady(false);
    setSignBeat("idle");
    setDevisStatut(null);

    if (!active) return;

    if (reduced) {
      setTyped(PROMPT);
      setAnalyseDone(ANALYSIS.length);
      setLinesVisible(LINES.length);
      setBeat("ready");
      setShowReady(true);
      setDevisStatut("signe");
      setSignBeat("back");
      later(finish, 500);
      return clearTimers;
    }

    // Micro s’active, puis transcription vocale
    later(() => setBeat("listen"), 350);
    later(() => setBeat("speak"), 900);

    return clearTimers;
  }, [active, reduced, finish]);

  // Transcription mot à mot (reconnaissance vocale simulée)
  useEffect(() => {
    if (beat !== "speak" || reduced) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    let acc = "";

    const tick = () => {
      if (i >= PROMPT_WORDS.length) {
        setBeat("pause");
        later(() => setBeat("analyse"), 520);
        return;
      }
      const token = PROMPT_WORDS[i];
      acc += token;
      setTyped(acc);
      i += 1;
      const isSpace = /^\s+$/.test(token);
      const delay = isSpace
        ? 40 + Math.random() * 30
        : token.length > 7
          ? 110 + Math.random() * 50
          : 70 + Math.random() * 55;
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, 180);
    return () => clearTimeout(timer);
  }, [beat, reduced]);

  useEffect(() => {
    if (beat !== "analyse" || reduced) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setAnalyseDone(n);
      if (n >= ANALYSIS.length) {
        clearInterval(id);
        later(() => setBeat("lines"), 420);
      }
    }, 480);
    return () => clearInterval(id);
  }, [beat, reduced]);

  useEffect(() => {
    if (beat !== "lines" || reduced) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setLinesVisible(n);
      if (n >= LINES.length) {
        clearInterval(id);
        later(() => setBeat("total"), 380);
      }
    }, 320);
    return () => clearInterval(id);
  }, [beat, reduced]);

  useEffect(() => {
    if (beat !== "total" || reduced) return;
    later(() => {
      setBeat("ready");
      setShowReady(true);
      setDevisStatut("ready");
      // Signature électronique — ~6,5 s, fidèle au parcours réel
      later(() => {
        setBeat("signflow");
        setSignBeat("send");
      }, 420);
      later(() => {
        setSignBeat("sending");
        setDevisStatut("envoye");
      }, 900);
      later(() => setSignBeat("mail"), 1450);
      later(() => setSignBeat("click"), 2050);
      later(() => setSignBeat("page"), 2650);
      later(() => setSignBeat("draw"), 3450);
      later(() => setSignBeat("validate"), 4300);
      later(() => {
        setSignBeat("signed");
        setDevisStatut("signe");
      }, 4750);
      later(() => setSignBeat("back"), 5450);
      later(finish, 6400);
    }, 650);
  }, [beat, reduced, finish]);

  const signing = ["mail", "click", "page", "draw", "validate", "signed"].includes(
    signBeat,
  );
  const copySigning =
    signing || signBeat === "send" || signBeat === "sending" || signBeat === "back";

  return (
    <div
      className={[
        "lp-hubMum__panel",
        signing ? "is-signing" : "",
        signBeat === "back" ? "is-signedBack" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <MumFilmCopy signing={copySigning} />
      <div className="lp-hubMum__stage">
        <MumInterface
          beat={beat === "signflow" ? "ready" : beat}
          typed={typed}
          analyseDone={analyseDone}
          linesVisible={linesVisible}
          showReady={showReady}
          listening={listening}
          devisStatut={devisStatut}
        />
        <MumSignJourney beat={signBeat} />
      </div>
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

export const MUM_HIGHLIGHT_MS = 900;
export const MUM_ENTER_MS = 1600;
export const MUM_RETURN_MS = 1500;
/** Plafond de sécurité si la démo ne signale pas la fin */
export const MUM_DEMO_SAFETY_MS = 46000;

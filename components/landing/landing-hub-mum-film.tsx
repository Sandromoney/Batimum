"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Bot, Check, Mic, Sparkles } from "lucide-react";
import { FilmCursor } from "@/components/landing/landing-hub-film-cursor";
import {
  MumSignJourney,
  type MumSignBeat,
} from "@/components/landing/landing-hub-mum-sign-overlay";
import { usePauseableTimers } from "@/lib/landing-hub-pauseable-timer";

const PROMPT =
  "Création d'une salle de bain complète de 18 m² avec remplacement de la douche existante par une douche à l'italienne 120 × 90 cm, meuble double vasque de 120 cm, faïence murale 30 × 60 sur 42 m², carrelage au sol 18 m², création des alimentations PER, remplacement des évacuations PVC, pose d'un sèche-serviettes et peinture du plafond.";

const PROMPT_WORDS = PROMPT.split(/(\s+)/).filter(Boolean);

const ANALYSIS = ["Quantités", "Matériaux", "Temps", "Structure"] as const;

/** Lignes dérivées strictement de la dictée — aucune donnée inventée. */
const LINES = [
  { label: "Dépose douche existante", qty: "1", unit: "u." },
  { label: "Douche à l'italienne 120 × 90 cm", qty: "1", unit: "u." },
  { label: "Meuble double vasque 120 cm", qty: "1", unit: "u." },
  { label: "Faïence murale 30 × 60", qty: "42", unit: "m²" },
  { label: "Carrelage sol", qty: "18", unit: "m²" },
  { label: "Alimentations PER", qty: "1", unit: "forfait" },
  { label: "Évacuations PVC", qty: "1", unit: "forfait" },
  { label: "Sèche-serviettes", qty: "1", unit: "u." },
  { label: "Peinture plafond", qty: "18", unit: "m²" },
] as const;

const PRICE_MASK = "•••";

/** Plans cadrés dans le viewport — un geste = un plan après le premier. */
export const MUM_VIEW_PLANS = [
  "dictation",
  "analyse",
  "lines",
  "totals",
  "send",
  "sign",
] as const;

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
  viewPlan,
  typed,
  analyseDone,
  linesVisible,
  showReady,
  listening,
  devisStatut,
}: {
  beat: DemoBeat;
  viewPlan: number;
  typed: string;
  analyseDone: number;
  linesVisible: number;
  showReady: boolean;
  listening: boolean;
  devisStatut: "ready" | "envoye" | "consulte" | "signe" | "commande" | null;
}) {
  /** Un plan = une composition centrée — jamais d’empilement vertical progressif. */
  const planDictation = viewPlan === 0;
  const planAnalyse = viewPlan === 1;
  const planLines = viewPlan === 2;
  const planTotals = viewPlan === 3;
  const showComposer = planDictation || planAnalyse;
  const typedPreview =
    typed.length > 140 ? `${typed.slice(0, 137).trim()}…` : typed;

  return (
    <div
      className="lp-hubMum__ui"
      data-view-plan={viewPlan}
      aria-hidden="true"
    >
      <div className="lp-hubMum__uiHead">
        <span className="lp-hubMum__uiBadge">
          <Sparkles size={13} strokeWidth={1.9} />
          MUM IA
        </span>
        {devisStatut === "commande" ? (
          <span className="lp-hubMum__statut is-signe">
            Commande confirmée
            <Check size={11} strokeWidth={2.6} />
          </span>
        ) : devisStatut === "signe" ? (
          <span className="lp-hubMum__statut is-signe">
            Signé
            <Check size={11} strokeWidth={2.6} />
          </span>
        ) : devisStatut === "consulte" ? (
          <span className="lp-hubMum__statut is-envoye">Consulté</span>
        ) : devisStatut === "envoye" ? (
          <span className="lp-hubMum__statut is-envoye">Envoyé</span>
        ) : (
          <span className="lp-hubMum__uiHeadMeta">
            {planDictation
              ? "Dictée"
              : planAnalyse
                ? "Analyse"
                : planLines
                  ? "Devis"
                  : planTotals
                    ? "Validation"
                    : "Préparation du devis"}
          </span>
        )}
      </div>

      {showComposer ? (
        <div
          className={[
            "lp-hubMum__composer",
            planAnalyse ? "is-compact" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
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
                {typedPreview || (listening ? "Écoute…" : "")}
              </p>
            </div>

            <div className="lp-hubMum__micWrap">
              <MicWaves active={listening} />
              <button
                type="button"
                data-cursor-target="mic"
                className={[
                  "lp-hubMum__mic",
                  listening ? "is-active" : "",
                  listening ? "is-hover" : "",
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
      ) : null}

      {planAnalyse ? (
        <div className="lp-hubMum__preview lp-hubMum__preview--plan">
          <div className="lp-hubMum__previewHead">
            <Bot size={14} strokeWidth={1.8} />
            <span>Informations détectées</span>
          </div>
          <div className="lp-hubMum__analyse">
            <ul className="lp-hubMum__analyseList">
              {ANALYSIS.map((item, i) => {
                const done = i < analyseDone;
                return (
                  <li key={item} className={done ? "is-done" : undefined}>
                    <span className="lp-hubMum__analyseMark" aria-hidden="true">
                      {done ? <Check size={12} strokeWidth={2.4} /> : null}
                    </span>
                    <span>{item}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      {planLines ? (
        <div className="lp-hubMum__preview lp-hubMum__preview--plan">
          <div className="lp-hubMum__devis">
            <div className="lp-hubMum__devisHead">
              <p className="lp-hubMum__sectionTitle">Salle de bain · 18 m²</p>
              <div className="lp-hubMum__colHeads" aria-hidden="true">
                <span>Prestation</span>
                <span>Qté</span>
                <span>Unité</span>
                <span>Prix</span>
              </div>
            </div>
            <ul className="lp-hubMum__lines lp-hubMum__lines--framed">
              {LINES.map((line, i) => (
                <li
                  key={line.label}
                  className={i < linesVisible ? "is-on" : undefined}
                >
                  <span className="lp-hubMum__lineLabel">{line.label}</span>
                  <span className="lp-hubMum__lineQty">{line.qty}</span>
                  <span className="lp-hubMum__lineUnit">{line.unit}</span>
                  <span className="lp-hubMum__lineAmt">{PRICE_MASK}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {planTotals ? (
        <div className="lp-hubMum__preview lp-hubMum__preview--plan">
          <div className="lp-hubMum__devis lp-hubMum__devis--summary">
            <p className="lp-hubMum__sectionTitle">Salle de bain · 18 m²</p>
            <ul className="lp-hubMum__lines lp-hubMum__lines--summary">
              {LINES.slice(0, 4).map((line) => (
                <li key={line.label} className="is-on">
                  <span className="lp-hubMum__lineLabel">{line.label}</span>
                  <span className="lp-hubMum__lineAmt">{PRICE_MASK}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-hubMum__totals is-on">
            <div className="lp-hubMum__totalRow">
              <span>Sous-total HT</span>
              <span aria-hidden="true">{PRICE_MASK}</span>
            </div>
            <div className="lp-hubMum__totalRow">
              <span>TVA</span>
              <span aria-hidden="true">{PRICE_MASK}</span>
            </div>
            <div className="lp-hubMum__totalRow is-grand">
              <span>Total TTC</span>
              <span aria-hidden="true">{PRICE_MASK}</span>
            </div>
          </div>
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

      <FilmCursor
        visible={beat === "listen"}
        target={beat === "listen" ? '[data-cursor-target="mic"]' : null}
        clicking={beat === "listen"}
      />
    </div>
  );
}

function MumFilmCopy({ signing }: { signing: boolean }) {
  return (
    <div className="lp-hubMum__copy">
      <h3 className="lp-hubMum__title">MUM IA</h3>
      <div className="lp-hubMum__copySlot" aria-live="polite">
        <p
          key={signing ? "sign" : "build"}
          className="lp-hubMum__subtitle is-swap"
        >
          {signing
            ? "Relisez, envoyez, faites signer."
            : "Décrivez le chantier. Obtenez un devis prêt à envoyer."}
        </p>
      </div>
      {!signing ? (
        <p className="lp-hubMum__hint">
          Basé sur vos prix, vos métiers et votre région
        </p>
      ) : null}
    </div>
  );
}

export function MumFilmPanel({
  active,
  reduced,
  plan = 0,
  paused = false,
  seekMs = 0,
  seekKey = 0,
  onPlanComplete,
}: {
  active: boolean;
  reduced: boolean;
  plan?: number;
  paused?: boolean;
  seekMs?: number;
  seekKey?: number;
  onPlanComplete: () => void;
}) {
  const [beat, setBeat] = useState<DemoBeat>("empty");
  const [typed, setTyped] = useState("");
  const [analyseDone, setAnalyseDone] = useState(0);
  const [linesVisible, setLinesVisible] = useState(0);
  const [showReady, setShowReady] = useState(false);
  const [signBeat, setSignBeat] = useState<MumSignBeat>("idle");
  const [devisStatut, setDevisStatut] = useState<
    "ready" | "envoye" | "consulte" | "signe" | "commande" | null
  >(null);
  const planDoneRef = useRef(-1);
  const planRef = useRef(plan);
  const { later, every, clear } = usePauseableTimers(paused);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  const completePlan = useCallback(
    (n: number) => {
      if (planDoneRef.current >= n) return;
      planDoneRef.current = n;
      onPlanComplete();
    },
    [onPlanComplete],
  );

  // Seek / changement de plan : toujours autoriser une nouvelle complétion.
  useEffect(() => {
    planDoneRef.current = -1;
  }, [active, plan, seekKey, seekMs]);

  const listening = beat === "listen" || beat === "speak";

  // Reset when film becomes inactive
  useEffect(() => {
    if (active) return;
    clear();
    planDoneRef.current = -1;
    setBeat("empty");
    setTyped("");
    setAnalyseDone(0);
    setLinesVisible(0);
    setShowReady(false);
    setSignBeat("idle");
    setDevisStatut(null);
  }, [active, clear]);

  // Reduced: jump to final
  useEffect(() => {
    if (!active || !reduced) return;
    clear();
    setTyped(PROMPT);
    setAnalyseDone(ANALYSIS.length);
    setLinesVisible(LINES.length);
    setBeat("ready");
    setShowReady(true);
    setDevisStatut("commande");
    setSignBeat("back");
    later(() => completePlan(5), 400);
    return clear;
  }, [active, reduced, completePlan, later, clear, seekKey]);

  // Plan 0 — dictée
  useEffect(() => {
    if (!active || reduced || plan !== 0) return;
    clear();
    planDoneRef.current = -1;
    setBeat("empty");
    setTyped("");
    setAnalyseDone(0);
    setLinesVisible(0);
    setShowReady(false);
    setSignBeat("idle");
    setDevisStatut(null);

    if (seekMs >= 520) {
      setBeat("speak");
    } else {
      later(() => setBeat("listen"), Math.max(0, 220 - seekMs));
      later(() => setBeat("speak"), Math.max(0, 520 - seekMs));
    }
    return clear;
  }, [active, reduced, plan, seekKey, seekMs, later, clear]);

  // Transcription — délais déterministes (timeline seekable)
  useEffect(() => {
    if (!active || reduced || plan !== 0 || beat !== "speak") return;
    clear();

    const tokenDelay = (token: string) =>
      /^\s+$/.test(token) ? 28 : token.length > 7 ? 62 : 42;

    // Temps média depuis le début du plan au moment où speak démarre
    const speakAt = 520;
    const localSeek = Math.max(0, seekMs - speakAt);
    let elapsed = 180;
    let startIndex = 0;
    let acc = "";

    if (localSeek > 0) {
      elapsed = 0;
      for (let i = 0; i < PROMPT_WORDS.length; i++) {
        const d = i === 0 ? 180 : tokenDelay(PROMPT_WORDS[i - 1]);
        if (elapsed + d > localSeek) {
          startIndex = i;
          break;
        }
        elapsed += d;
        acc += PROMPT_WORDS[i];
        startIndex = i + 1;
      }
      setTyped(acc);
      if (startIndex >= PROMPT_WORDS.length) {
        setBeat("pause");
        later(() => completePlan(0), 600);
        return clear;
      }
    }

    let i = startIndex;
    const tick = () => {
      if (i >= PROMPT_WORDS.length) {
        setBeat("pause");
        later(() => completePlan(0), 600);
        return;
      }
      const token = PROMPT_WORDS[i];
      acc += token;
      setTyped(acc);
      i += 1;
      later(tick, tokenDelay(token));
    };

    later(tick, localSeek > 0 ? Math.max(16, tokenDelay(PROMPT_WORDS[Math.max(0, startIndex - 1)])) : 180);
    return clear;
  }, [active, reduced, plan, beat, completePlan, later, clear, seekKey, seekMs]);

  // Plan 1 — analyse
  useEffect(() => {
    if (!active || reduced || plan !== 1) return;
    clear();
    setBeat("analyse");
    const startN = Math.min(
      ANALYSIS.length,
      Math.floor(Math.max(0, seekMs) / 280),
    );
    setAnalyseDone(startN);
    if (startN >= ANALYSIS.length) {
      later(() => completePlan(1), 500);
      return clear;
    }
    let n = startN;
    every(() => {
      n += 1;
      setAnalyseDone(n);
      if (n >= ANALYSIS.length) {
        clear();
        later(() => completePlan(1), 500);
      }
    }, 280);
    return clear;
  }, [active, reduced, plan, completePlan, later, every, clear, seekKey, seekMs]);

  // Plan 2 — lignes devis
  useEffect(() => {
    if (!active || reduced || plan !== 2) return;
    clear();
    setBeat("lines");
    setAnalyseDone(ANALYSIS.length);
    const startN = Math.min(
      LINES.length,
      Math.floor(Math.max(0, seekMs) / 200),
    );
    setLinesVisible(startN);
    if (startN >= LINES.length) {
      later(() => completePlan(2), 520);
      return clear;
    }
    let n = startN;
    every(() => {
      n += 1;
      setLinesVisible(n);
      if (n >= LINES.length) {
        clear();
        later(() => completePlan(2), 520);
      }
    }, 200);
    return clear;
  }, [active, reduced, plan, completePlan, later, every, clear, seekKey, seekMs]);

  // Plan 3 — totaux + prêt
  useEffect(() => {
    if (!active || reduced || plan !== 3) return;
    clear();
    setLinesVisible(LINES.length);
    setAnalyseDone(ANALYSIS.length);
    if (seekMs >= 400) {
      setBeat("ready");
      setShowReady(true);
      setDevisStatut("ready");
    } else {
      setBeat("total");
      later(() => {
        setBeat("ready");
        setShowReady(true);
        setDevisStatut("ready");
      }, 400 - seekMs);
    }
    later(() => completePlan(3), Math.max(16, 900 - seekMs));
    return clear;
  }, [active, reduced, plan, completePlan, later, clear, seekKey, seekMs]);

  // Plan 4 — envoi + mail + consulter
  useEffect(() => {
    if (!active || reduced || plan !== 4) return;
    clear();
    setShowReady(true);
    setBeat("signflow");

    const cues: { at: number; apply: () => void }[] = [
      {
        at: 0,
        apply: () => setSignBeat("send"),
      },
      {
        at: 480,
        apply: () => {
          setSignBeat("sending");
          setDevisStatut("envoye");
        },
      },
      { at: 1050, apply: () => setSignBeat("mail") },
      { at: 1670, apply: () => setSignBeat("openMail") },
      { at: 2280, apply: () => setSignBeat("consult") },
      {
        at: 2980,
        apply: () => {
          setSignBeat("page");
          setDevisStatut("consulte");
        },
      },
    ];
    for (const cue of cues) {
      if (cue.at <= seekMs) cue.apply();
      else later(cue.apply, cue.at - seekMs);
    }
    later(() => completePlan(4), Math.max(16, 3600 - seekMs));
    return clear;
  }, [active, reduced, plan, completePlan, clear, later, seekKey, seekMs]);

  // Plan 5 — signature + commande
  useEffect(() => {
    if (!active || reduced || plan !== 5) return;
    clear();
    setBeat("signflow");
    setDevisStatut("consulte");

    const cues: { at: number; apply: () => void }[] = [
      { at: 0, apply: () => setSignBeat("scroll") },
      { at: 650, apply: () => setSignBeat("hoverSign") },
      { at: 1220, apply: () => setSignBeat("signModal") },
      { at: 1790, apply: () => setSignBeat("draw") },
      { at: 2600, apply: () => setSignBeat("validate") },
      { at: 3090, apply: () => setSignBeat("validating") },
      {
        at: 3570,
        apply: () => {
          setSignBeat("pipeline");
          setDevisStatut("signe");
        },
      },
      {
        at: 4140,
        apply: () => {
          setSignBeat("commande");
          setDevisStatut("commande");
        },
      },
      { at: 4710, apply: () => setSignBeat("back") },
    ];
    for (const cue of cues) {
      if (cue.at <= seekMs) cue.apply();
      else later(cue.apply, cue.at - seekMs);
    }
    later(() => completePlan(5), Math.max(16, 5200 - seekMs));
    return clear;
  }, [active, reduced, plan, completePlan, clear, later, seekKey, seekMs]);

  const signing = plan >= 4 && [
    "mail",
    "openMail",
    "consult",
    "page",
    "scroll",
    "hoverSign",
    "signModal",
    "draw",
    "validate",
    "validating",
    "pipeline",
    "commande",
  ].includes(signBeat);
  const copySigning =
    plan >= 4 ||
    signing ||
    signBeat === "send" ||
    signBeat === "sending" ||
    signBeat === "back";

  return (
    <div
      className={[
        "lp-hubMum__panel",
        signing ? "is-signing" : "",
        signBeat === "back" ? "is-signedBack" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-mum-plan={plan}
    >
      <MumFilmCopy signing={copySigning} />
      <div className="lp-hubMum__stage">
        <MumInterface
          beat={beat === "signflow" ? "ready" : beat}
          viewPlan={plan}
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
export const MUM_ENTER_MS = 680;
export const MUM_RETURN_MS = 750;
/** Plafond de sécurité si la démo ne signale pas la fin */
export const MUM_DEMO_SAFETY_MS = 78000;

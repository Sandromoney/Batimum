"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from "react";
import { Check, Mic, Send } from "lucide-react";
import { LandingPhone } from "@/components/landing/landing-device-frames";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const DICTATION =
  "Fais un devis pour Monsieur Dupont. Fourniture et pose de 25 m² de carrelage dans sa salle de bain.";

const ANALYSIS = [
  "Client identifié",
  "Lot carrelage",
  "Surface : 25 m²",
  "Fourniture et pose",
  "TVA à vérifier",
] as const;

const DEVIS_LINES = [
  "Préparation du support",
  "Fourniture du carrelage",
  "Pose collée",
  "Joints et finitions",
] as const;

const BENEFITS = [
  {
    id: "saisie",
    title: "Moins de saisie",
    text: "Vous décrivez. Batimum structure le brief.",
    from: 0.18,
  },
  {
    id: "rapide",
    title: "Des devis préparés plus rapidement",
    text: "Lots et prestations se construisent pendant que vous êtes sur place.",
    from: 0.55,
  },
  {
    id: "chantier",
    title: "Plus besoin d’attendre d’être au bureau",
    text: "Vous préparez depuis le chantier, puis vous vérifiez avant d’envoyer.",
    from: 0.82,
  },
] as const;

type DemoPhase = 1 | 2 | 3 | 4 | 5;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function phaseFromProgress(p: number): DemoPhase {
  if (p < 0.14) return 1;
  if (p < 0.36) return 2;
  if (p < 0.55) return 3;
  if (p < 0.78) return 4;
  return 5;
}

function dictationChars(progress: number) {
  if (progress < 0.14) return 0;
  if (progress >= 0.36) return DICTATION.length;
  const t = (progress - 0.14) / 0.22;
  return Math.floor(t * DICTATION.length);
}

function analysisCount(progress: number) {
  if (progress < 0.36) return 0;
  if (progress >= 0.55) return ANALYSIS.length;
  const t = (progress - 0.36) / 0.19;
  return Math.min(ANALYSIS.length, 1 + Math.floor(t * ANALYSIS.length));
}

function devisCount(progress: number) {
  if (progress < 0.55) return 0;
  if (progress >= 0.78) return DEVIS_LINES.length;
  const t = (progress - 0.55) / 0.23;
  return Math.min(DEVIS_LINES.length, 1 + Math.floor(t * DEVIS_LINES.length));
}

function useIsDesktop() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

function useScrollProgress(trackRef: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const travel = Math.max(1, track.offsetHeight - window.innerHeight);
      setProgress(clamp01(-rect.top / travel));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [trackRef]);

  return progress;
}

export function LandingVoiceDemoSection() {
  const reducedMotion = usePrefersReducedMotion();
  const isDesktop = useIsDesktop();
  const trackRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useScrollProgress(trackRef);
  const [autoProgress, setAutoProgress] = useState(0);
  const [mobileActive, setMobileActive] = useState(false);

  useEffect(() => {
    const node = layoutRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setMobileActive(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || isDesktop || !mobileActive) return;

    let start = 0;
    let frame = 0;
    const duration = 7800;

    const tick = (now: number) => {
      if (!start) start = now;
      const t = clamp01((now - start) / duration);
      setAutoProgress(t);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion, isDesktop, mobileActive]);

  const progress = reducedMotion
    ? 1
    : isDesktop
      ? scrollProgress
      : autoProgress;

  const phase = phaseFromProgress(progress);
  const typed = DICTATION.slice(0, dictationChars(progress));
  const shownAnalysis = ANALYSIS.slice(0, analysisCount(progress));
  const shownLines = DEVIS_LINES.slice(0, devisCount(progress));

  return (
    <section
      id="demo-devis"
      className="landing-voice-demo"
      aria-label="Démonstration création de devis assistée"
    >
      <div ref={trackRef} className="landing-voice-demo__track">
        <div className="landing-voice-demo__sticky">
          <div className="landing-container">
            <header className="landing-voice-demo__header">
              <p className="landing-voice-demo__badge">
                Création de devis assistée
              </p>
              <h2 className="landing-voice-demo__title">
                Parlez. Batimum{" "}
                <span className="landing-voice-demo__mark">prépare</span> le
                devis.
              </h2>
              <p className="landing-voice-demo__lead">
                Depuis le chantier, décrivez simplement les travaux. Batimum
                structure les lots, les prestations et les montants pour vous
                faire gagner du temps.
              </p>
            </header>

            <div ref={layoutRef} className="landing-voice-demo__layout">
              <div className="landing-voice-demo__stage">
                <LandingPhone
                  className="landing-voice-demo__phone"
                  statusLabel="Batimum"
                  alive
                >
                  <VoiceDemoScreen
                    phase={phase}
                    typed={typed}
                    analysis={shownAnalysis}
                    lines={shownLines}
                    progress={progress}
                  />
                </LandingPhone>
                <p className="landing-voice-demo__footnote">
                  Batimum prépare. Vous vérifiez. Puis vous envoyez.
                </p>
              </div>

              <ul className="landing-voice-demo__benefits" role="list">
                {BENEFITS.map((benefit) => {
                  const visible = progress >= benefit.from;
                  return (
                    <li
                      key={benefit.id}
                      className={cn(
                        "landing-voice-demo__benefit",
                        visible && "landing-voice-demo__benefit--visible",
                      )}
                      style={
                        {
                          "--benefit-delay": `${benefit.from * 80}ms`,
                        } as CSSProperties
                      }
                    >
                      <span className="landing-voice-demo__benefit-check" aria-hidden>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="landing-voice-demo__benefit-title">
                          {benefit.title}
                        </p>
                        <p className="landing-voice-demo__benefit-text">
                          {benefit.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VoiceDemoScreen({
  phase,
  typed,
  analysis,
  lines,
  progress,
}: {
  phase: DemoPhase;
  typed: string;
  analysis: readonly string[];
  lines: readonly string[];
  progress: number;
}) {
  return (
    <div
      className={cn(
        "voice-demo-ui",
        `voice-demo-ui--phase-${phase}`,
      )}
      aria-live="polite"
    >
      <div className="voice-demo-ui__top">
        <strong>Nouveau devis</strong>
        <span
          className={cn(
            "voice-demo-ui__pill",
            phase >= 5 && "voice-demo-ui__pill--ready",
          )}
        >
          {phase >= 5
            ? "Prêt"
            : phase >= 4
              ? "Structuration"
              : phase >= 3
                ? "Analyse"
                : phase >= 2
                  ? "Dictée"
                  : "Micro"}
        </span>
      </div>

      {phase === 1 ? (
        <div className="voice-demo-ui__mic-panel">
          <button type="button" className="voice-demo-ui__mic" tabIndex={-1}>
            <Mic className="h-6 w-6" aria-hidden />
          </button>
          <p className="voice-demo-ui__mic-label">Décrivez les travaux</p>
          <p className="voice-demo-ui__hint">
            Parlez naturellement — Batimum structure ensuite.
          </p>
        </div>
      ) : null}

      {phase >= 2 && phase < 4 ? (
        <div className="voice-demo-ui__card voice-demo-ui__card--dictation">
          <p className="voice-demo-ui__kicker">Dictée</p>
          <p className="voice-demo-ui__dictation">
            {typed}
            {phase === 2 && typed.length < DICTATION.length ? (
              <span className="voice-demo-ui__caret" aria-hidden />
            ) : null}
          </p>
        </div>
      ) : null}

      {phase >= 3 && phase < 4 ? (
        <div className="voice-demo-ui__card">
          <p className="voice-demo-ui__kicker">Analyse</p>
          <ul className="voice-demo-ui__analysis" role="list">
            {analysis.map((item) => (
              <li key={item} className="voice-demo-ui__analysis-item">
                <Check className="h-3.5 w-3.5" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {phase >= 4 ? (
        <div className="voice-demo-ui__card voice-demo-ui__card--devis">
          <p className="voice-demo-ui__kicker">Proposition à vérifier</p>
          <p className="voice-demo-ui__lot-title">Lot carrelage</p>
          <ul className="voice-demo-ui__lines" role="list">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {lines.length < DEVIS_LINES.length ? (
            <p className="voice-demo-ui__building">Construction du devis…</p>
          ) : (
            <p className="voice-demo-ui__note">
              Montants à valider — rien n’est envoyé automatiquement.
            </p>
          )}
        </div>
      ) : null}

      {phase >= 5 ? (
        <div className="voice-demo-ui__ready">
          <p className="voice-demo-ui__ready-title">Devis prêt</p>
          <div className="voice-demo-ui__actions">
            <span className="voice-demo-ui__btn voice-demo-ui__btn--ghost">
              Vérifier
            </span>
            <span
              className={cn(
                "voice-demo-ui__btn voice-demo-ui__btn--primary",
                progress >= 0.9 && "voice-demo-ui__btn--appear",
              )}
            >
              Envoyer au client
              <Send className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

/** Fusion modules → respiration → écrou → vissage → textes → CTAs */
export const SIG_MERGE_MS = 1800;
export const SIG_BREATH_MS = 2000;
export const SIG_APPROACH_MS = 2800;
export const SIG_SCREW_MS = 3200;
export const SIG_PULSE_MS = 900;
export const SIG_COPY_MS = 2200;
export const SIG_CTA_MS = 900;
export const SIG_HOLD_MS = 800;

export const SIG_DEMO_SAFETY_MS =
  SIG_MERGE_MS +
  SIG_BREATH_MS +
  SIG_APPROACH_MS +
  SIG_SCREW_MS +
  SIG_PULSE_MS +
  SIG_COPY_MS +
  SIG_CTA_MS +
  SIG_HOLD_MS +
  1500;

const BM_SRC = "/logo-batimum.png";
const BM_SRC_W = 829;
const BM_SRC_H = 210;

type SigBeat =
  | "merge"
  | "breath"
  | "approach"
  | "screw"
  | "pulse"
  | "copy"
  | "cta"
  | "sealed";

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (i * 60);
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(" ");
}

/**
 * Écrou signature — même ADN que le Hero, version plus mature :
 * moins de facettes décoratives, traits plus fins, bleu plus discret.
 */
function SignatureNutSvg() {
  const cx = 200;
  const cy = 200;
  const outerR = 186;
  const midR = 168;
  const innerR = 154;
  const holeR = 56;
  const ringR = 70;
  const chamferR = 80;
  const back = hexPoints(cx + 3.5, cy + 4.5, outerR);
  const outer = hexPoints(cx, cy, outerR);
  const mid = hexPoints(cx, cy, midR);
  const inner = hexPoints(cx, cy, innerR);

  return (
    <svg
      className="lp-hubSig__nutSvg"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="sigNutFace"
          x1="70"
          y1="55"
          x2="310"
          y2="330"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.26)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
        </linearGradient>
        <linearGradient
          id="sigNutShine"
          x1="95"
          y1="75"
          x2="200"
          y2="185"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id="sigNutBlue" cx="40%" cy="36%" r="52%">
          <stop offset="0%" stopColor="rgba(17,17,17,0.03)" />
          <stop offset="100%" stopColor="rgba(17,17,17,0)" />
        </radialGradient>
        <radialGradient id="sigNutHoleShade" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="rgba(17,17,17,0)" />
          <stop offset="75%" stopColor="rgba(17,17,17,0.018)" />
          <stop offset="100%" stopColor="rgba(17,17,17,0.045)" />
        </radialGradient>
      </defs>

      <polygon
        points={back}
        fill="rgba(248,250,252,0.18)"
        stroke="rgba(17,17,17,0.045)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <polygon
        points={outer}
        fill="url(#sigNutFace)"
        stroke="rgba(17,17,17,0.13)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <polygon points={outer} fill="url(#sigNutBlue)" stroke="none" />
      <polygon
        points={mid}
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(17,17,17,0.07)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <polygon
        points={inner}
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(17,17,17,0.045)"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />

      {Array.from({ length: 6 }, (_, i) => {
        const a0 = (Math.PI / 180) * (i * 60);
        const a1 = (Math.PI / 180) * ((i + 1) * 60);
        const x0 = cx + Math.cos(a0) * midR;
        const y0 = cy + Math.sin(a0) * midR;
        const x1 = cx + Math.cos(a1) * midR;
        const y1 = cy + Math.sin(a1) * midR;
        const ix0 = cx + Math.cos(a0) * ringR;
        const iy0 = cy + Math.sin(a0) * ringR;
        const ix1 = cx + Math.cos(a1) * ringR;
        const iy1 = cy + Math.sin(a1) * ringR;
        const lit = i === 0 || i === 1;
        const shade = i === 3 || i === 4;
        return (
          <polygon
            key={`pan-${i}`}
            points={`${x0},${y0} ${x1},${y1} ${ix1},${iy1} ${ix0},${iy0}`}
            fill={
              lit
                ? "rgba(255,255,255,0.11)"
                : shade
                  ? "rgba(17,17,17,0.022)"
                  : "rgba(255,255,255,0.03)"
            }
            stroke="none"
          />
        );
      })}

      <polygon
        points={`${cx + Math.cos((-18 * Math.PI) / 180) * midR},${cy + Math.sin((-18 * Math.PI) / 180) * midR} ${cx + Math.cos((38 * Math.PI) / 180) * midR},${cy + Math.sin((38 * Math.PI) / 180) * midR} ${cx + Math.cos((38 * Math.PI) / 180) * (ringR + 6)},${cy + Math.sin((38 * Math.PI) / 180) * (ringR + 6)} ${cx + Math.cos((-18 * Math.PI) / 180) * (ringR + 6)},${cy + Math.sin((-18 * Math.PI) / 180) * (ringR + 6)}`}
        fill="url(#sigNutShine)"
        opacity="0.48"
        stroke="none"
      />

      <circle
        cx={cx}
        cy={cy}
        r={chamferR}
        stroke="rgba(17,17,17,0.04)"
        strokeWidth="0.85"
        fill="none"
      />
      <circle
        cx={cx}
        cy={cy}
        r={ringR}
        stroke="rgba(17,17,17,0.08)"
        strokeWidth="1.05"
        fill="rgba(255,255,255,0.05)"
      />
      <circle
        cx={cx}
        cy={cy}
        r={holeR + 5}
        stroke="rgba(17,17,17,0.05)"
        strokeWidth="0.85"
        fill="url(#sigNutHoleShade)"
      />
      <circle
        cx={cx}
        cy={cy}
        r={holeR}
        stroke="rgba(17,17,17,0.15)"
        strokeWidth="1.25"
        fill="rgba(255,255,255,0.015)"
      />
    </svg>
  );
}

function SigBmMark({ breathe }: { breathe: boolean }) {
  return (
    <div
      className={[
        "lp-hubSig__bm",
        breathe ? "is-breathing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BM_SRC}
        alt=""
        className="lp-hubSig__bmImg"
        width={BM_SRC_W}
        height={BM_SRC_H}
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

export function HubSignaturePanel({
  active,
  sealed,
  reduced,
  onComplete,
}: {
  /** Joue la séquence complète une fois. */
  active: boolean;
  /** État final déjà assemblé (revisit / reduced). */
  sealed: boolean;
  reduced: boolean;
  onComplete: () => void;
}) {
  const [beat, setBeat] = useState<SigBeat>(sealed ? "sealed" : "merge");
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
    setBeat("sealed");
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    clearTimers();
    finishedRef.current = false;

    if (sealed || reduced) {
      setBeat("sealed");
      if (active) later(finish, 400);
      return clearTimers;
    }

    if (!active) {
      setBeat("merge");
      return clearTimers;
    }

    let t = 0;
    setBeat("merge");
    t += SIG_MERGE_MS;
    later(() => setBeat("breath"), t);
    t += SIG_BREATH_MS;
    later(() => setBeat("approach"), t);
    t += SIG_APPROACH_MS;
    later(() => setBeat("screw"), t);
    t += SIG_SCREW_MS;
    later(() => setBeat("pulse"), t);
    t += SIG_PULSE_MS;
    later(() => setBeat("copy"), t);
    t += SIG_COPY_MS;
    later(() => setBeat("cta"), t);
    t += SIG_CTA_MS + SIG_HOLD_MS;
    later(finish, t);

    return clearTimers;
  }, [active, sealed, reduced, finish]);

  const signupHref = getPublicSignupHref();
  const primaryLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";

  const showNut =
    beat === "approach" ||
    beat === "screw" ||
    beat === "pulse" ||
    beat === "copy" ||
    beat === "cta" ||
    beat === "sealed";

  const showCopy =
    beat === "copy" || beat === "cta" || beat === "sealed";
  const showCta = beat === "cta" || beat === "sealed";
  const logoBreath = beat === "breath";
  const idleBreath = beat === "sealed" || beat === "cta";

  return (
    <div
      className={[
        "lp-hubSig",
        `is-${beat}`,
        sealed || reduced ? "is-sealed" : "",
        active || sealed ? "is-visible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!(active || sealed)}
    >
      <div className="lp-hubSig__stage">
        <div
          className={[
            "lp-hubSig__mark",
            logoBreath ? "is-breath-once" : "",
            idleBreath ? "is-breath-idle" : "",
            beat === "pulse" ? "is-pulse" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            className={[
              "lp-hubSig__halo",
              beat === "pulse" ? "is-pulse" : "",
              beat === "sealed" || beat === "cta" ? "is-soft" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          />

          <div
            className={[
              "lp-hubSig__nut",
              showNut ? "is-on" : "",
              beat === "approach" ? "is-approach" : "",
              beat === "screw" ? "is-screw" : "",
              beat === "pulse" ||
              beat === "copy" ||
              beat === "cta" ||
              beat === "sealed"
                ? "is-seated"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            <SignatureNutSvg />
          </div>

          <SigBmMark breathe={idleBreath && !reduced} />
        </div>

        <div
          className={[
            "lp-hubSig__copy",
            showCopy ? "is-on" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="lp-hubSig__brand">BATIMUM</p>
          <p className="lp-hubSig__lead">
            Les piliers pour piloter votre entreprise du BTP.
          </p>
          <p className="lp-hubSig__sub">
            Ce qui fait avancer votre activité, au même endroit.
          </p>
        </div>

        <div
          className={[
            "lp-hubSig__cta",
            showCta ? "is-on" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Link
            href={signupHref}
            className="landing-btn-primary landing-btn-interactive group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold no-underline"
            tabIndex={showCta ? 0 : -1}
          >
            {primaryLabel}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/landing#plans"
            className="landing-btn-secondary landing-btn-interactive inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold no-underline"
            tabIndex={showCta ? 0 : -1}
          >
            Réserver une démonstration
          </Link>
        </div>
      </div>
    </div>
  );
}

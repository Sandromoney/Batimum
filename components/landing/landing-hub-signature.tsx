"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { hexPoints, polarPoint, svgPair } from "@/lib/svg-stable";
import {
  runCueTimeline,
  usePauseableTimers,
} from "@/lib/landing-hub-pauseable-timer";
import {
  SIG_APPROACH_MS,
  SIG_COPY_MS,
  SIG_CTA_MS,
  SIG_DEMO_SAFETY_MS,
  SIG_DISMISS_EACH_MS,
  SIG_DISMISS_TOTAL_MS,
  SIG_HOLD_MS,
  SIG_PULSE_MS,
  SIG_SCREW_MS,
  SIG_SOLO_MS,
} from "@/lib/landing-hub-timeline";

export {
  SIG_APPROACH_MS,
  SIG_COPY_MS,
  SIG_CTA_MS,
  SIG_DEMO_SAFETY_MS,
  SIG_DISMISS_EACH_MS,
  SIG_DISMISS_TOTAL_MS,
  SIG_HOLD_MS,
  SIG_PULSE_MS,
  SIG_SCREW_MS,
  SIG_SOLO_MS,
};

/** @deprecated alias — fusion remplacée par dismiss horaire */
export const SIG_MERGE_MS = SIG_DISMISS_TOTAL_MS;
export const SIG_BREATH_MS = SIG_SOLO_MS;

const BM_SRC = "/logo-batimum.png";
const BM_SRC_W = 829;
const BM_SRC_H = 210;

type SigBeat =
  | "dismiss"
  | "solo"
  | "approach"
  | "screw"
  | "pulse"
  | "copy"
  | "cta"
  | "sealed";

function SignatureNutSvg() {
  const cx = 200;
  const cy = 200;
  const outerR = 186;
  const midR = 168;
  const innerR = 154;
  const holeR = 56;
  const ringR = 70;
  const back = hexPoints(cx + 3.5, cy + 4.5, outerR);
  const outer = hexPoints(cx, cy, outerR);
  const mid = hexPoints(cx, cy, midR);
  const inner = hexPoints(cx, cy, innerR);
  const shineA = polarPoint(cx, cy, -18, midR);
  const shineB = polarPoint(cx, cy, 38, midR);
  const shineC = polarPoint(cx, cy, 38, ringR + 6);
  const shineD = polarPoint(cx, cy, -18, ringR + 6);
  const shine = `${svgPair(shineA.x, shineA.y)} ${svgPair(shineB.x, shineB.y)} ${svgPair(shineC.x, shineC.y)} ${svgPair(shineD.x, shineD.y)}`;

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
        stroke="rgba(17,17,17,0.14)"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <polygon
        points={mid}
        fill="url(#sigNutBlue)"
        stroke="rgba(17,17,17,0.08)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <polygon
        points={inner}
        fill="rgba(255,255,255,0.22)"
        stroke="rgba(17,17,17,0.1)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <polygon points={shine} fill="url(#sigNutShine)" opacity="0.9" />
      <circle cx={cx} cy={cy} r={ringR} fill="url(#sigNutHoleShade)" />
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

function SigBmMark() {
  return (
    <div className="lp-hubSig__bm">
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

function beatFromOffset(ms: number): SigBeat {
  let t = 0;
  if (ms < (t += SIG_DISMISS_TOTAL_MS)) return "dismiss";
  if (ms < (t += SIG_SOLO_MS)) return "solo";
  if (ms < (t += SIG_APPROACH_MS)) return "approach";
  if (ms < (t += SIG_SCREW_MS)) return "screw";
  if (ms < (t += SIG_PULSE_MS)) return "pulse";
  if (ms < (t += SIG_COPY_MS)) return "copy";
  if (ms < (t += SIG_CTA_MS)) return "cta";
  return "sealed";
}

export function HubSignaturePanel({
  active,
  sealed,
  reduced,
  paused = false,
  seekMs = 0,
  seekKey = 0,
  onComplete,
}: {
  active: boolean;
  sealed: boolean;
  reduced: boolean;
  paused?: boolean;
  seekMs?: number;
  seekKey?: number;
  onComplete: () => void;
}) {
  const [beat, setBeat] = useState<SigBeat>(sealed ? "sealed" : "dismiss");
  const finishedRef = useRef(false);
  const { later, clear } = usePauseableTimers(paused);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setBeat("sealed");
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    clear();
    finishedRef.current = false;

    if (sealed || reduced) {
      setBeat("sealed");
      if (active) later(finish, 400);
      return clear;
    }

    if (!active) {
      setBeat("dismiss");
      return clear;
    }

    setBeat(beatFromOffset(seekMs));

    const t0 = 0;
    const tSolo = SIG_DISMISS_TOTAL_MS;
    const tApproach = tSolo + SIG_SOLO_MS;
    const tScrew = tApproach + SIG_APPROACH_MS;
    const tPulse = tScrew + SIG_SCREW_MS;
    const tCopy = tPulse + SIG_PULSE_MS;
    const tCta = tCopy + SIG_COPY_MS;

    const cues: { at: number; apply: () => void }[] = [
      { at: t0, apply: () => setBeat("dismiss") },
      { at: tSolo, apply: () => setBeat("solo") },
      { at: tApproach, apply: () => setBeat("approach") },
      { at: tScrew, apply: () => setBeat("screw") },
      { at: tPulse, apply: () => setBeat("pulse") },
      { at: tCopy, apply: () => setBeat("copy") },
      { at: tCta, apply: () => setBeat("cta") },
    ];

    runCueTimeline({
      cues,
      seekMs,
      later,
      onFinish: finish,
      finishAt: SIG_DEMO_SAFETY_MS - SIG_HOLD_MS,
    });

    return clear;
  }, [active, sealed, reduced, finish, later, clear, seekKey, seekMs]);

  const showStage =
    beat === "solo" ||
    beat === "approach" ||
    beat === "screw" ||
    beat === "pulse" ||
    beat === "copy" ||
    beat === "cta" ||
    beat === "sealed";

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

  return (
    <div
      className={[
        "lp-hubSig",
        `is-${beat}`,
        sealed || reduced ? "is-sealed" : "",
        active || sealed ? "is-visible" : "",
        showStage ? "is-stage-on" : "is-stage-off",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!(active || sealed)}
    >
      <div className="lp-hubSig__stage">
        <div
          className={[
            "lp-hubSig__mark",
            beat === "pulse" ? "is-pulse" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            className={[
              "lp-hubSig__halo",
              "is-hidden",
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

          {/* Logo BM : toujours fixe, jamais de scale / rotation */}
          <SigBmMark />
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
            Tout votre BTP, centralisé. Simple. Efficace.
          </p>
          <p className="lp-hubSig__sub">
            Devis, équipes, chantiers et marges — enfin au même endroit.
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
          <LandingTrialCta
            className="lp-hubSig__trial"
            buttonClassName="rounded-xl px-6 py-3.5 text-sm font-semibold"
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

export type HeroFeatureId =
  | "devis"
  | "planning"
  | "chantiers"
  | "facturation"
  | "clients"
  | "pilotage";

type OrbitCard = {
  id: HeroFeatureId;
  title: string;
  subtitle: string;
  detail: string;
  orbit: 0 | 1 | 2;
  angle: number;
  accent: string;
  Icon: typeof Sparkles;
  floatClass: string;
};

const ICON_ACCENT = "#3B82F6";

/**
 * Three separated elliptical orbits (2 bubbles each, always 180° apart).
 * Inner: Devis / Pilotage
 * Mid: Planning / Chantiers
 * Outer: Facturation / Clients
 */
export const HERO_FEATURES: OrbitCard[] = [
  {
    id: "devis",
    title: "Devis avec IA",
    subtitle: "Créés en quelques minutes",
    detail: "Décrivez les travaux, Batimum prépare le devis.",
    orbit: 0,
    angle: 20,
    accent: ICON_ACCENT,
    Icon: Sparkles,
    floatClass: "batimumHero__bubble--floatA",
  },
  {
    id: "pilotage",
    title: "Pilotage et rentabilité",
    subtitle: "Marge suivie en direct",
    detail: "Visualisez vos marges avant qu’il ne soit trop tard.",
    orbit: 0,
    angle: 200,
    accent: ICON_ACCENT,
    Icon: LayoutDashboard,
    floatClass: "batimumHero__bubble--floatB",
  },
  {
    id: "planning",
    title: "Planning des équipes",
    subtitle: "Organisation claire",
    detail: "Organisez vos équipes en quelques clics.",
    orbit: 1,
    angle: 100,
    accent: ICON_ACCENT,
    Icon: CalendarDays,
    floatClass: "batimumHero__bubble--floatC",
  },
  {
    id: "chantiers",
    title: "Suivi des chantiers",
    subtitle: "Avancement maîtrisé",
    detail: "Suivez l’avancement depuis le bureau ou le terrain.",
    orbit: 1,
    angle: 280,
    accent: ICON_ACCENT,
    Icon: Building2,
    floatClass: "batimumHero__bubble--floatD",
  },
  {
    id: "facturation",
    title: "Facturation",
    subtitle: "Devis → facture",
    detail: "Transformez vos devis en factures simplement.",
    orbit: 2,
    angle: 150,
    accent: ICON_ACCENT,
    Icon: Receipt,
    floatClass: "batimumHero__bubble--floatE",
  },
  {
    id: "clients",
    title: "Clients centralisés",
    subtitle: "Historique complet",
    detail: "Retrouvez toutes les informations au même endroit.",
    orbit: 2,
    angle: 330,
    accent: ICON_ACCENT,
    Icon: Users,
    floatClass: "batimumHero__bubble--floatF",
  },
];

/** Scroll focus: Devis → Clients → Planning → Chantiers → Pilotage → Facturation */
export const FOCUS_RANGES: {
  id: HeroFeatureId | null;
  start: number;
  end: number;
}[] = [
  { id: null, start: 0, end: 0.24 },
  { id: "devis", start: 0.24, end: 0.36 },
  { id: "clients", start: 0.36, end: 0.48 },
  { id: "planning", start: 0.48, end: 0.6 },
  { id: "chantiers", start: 0.6, end: 0.72 },
  { id: "pilotage", start: 0.72, end: 0.84 },
  { id: "facturation", start: 0.84, end: 0.94 },
  { id: null, start: 0.94, end: 1 },
];

/**
 * 3 orbites × 2 bulles à 180° — même vitesse par orbite, même sens.
 *
 * Brief de base : 155×120 / 235×175 / 305×230 sur scène ~760.
 * Fallbacks pour garantir ≥36px logo, ≥28px entre bulles, ≥28px bord :
 * scène 880px + rayons légèrement augmentés (bulles restent 156px).
 */
const ORBIT_CFG = [
  { rx: 200, ry: 152, duration: 52, reverse: false },
  { rx: 255, ry: 192, duration: 68, reverse: false },
  { rx: 318, ry: 240, duration: 84, reverse: false },
] as const;

/** Scène de référence (CSS: min(880px, 56vw)). */
const BASE_SCENE = 880;
const LOGO_HALF = 50;
const BUBBLE_HALF_W = 78; /* 156px / 2 */
const FOCUS_NUDGE_MAX = 28;
const DISC_DURATION = 62;

function useSceneSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState(880);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize(entry.contentRect.width || 880);
    });
    ro.observe(el);
    setSize(el.clientWidth || 880);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function activeFeatureAt(progress: number): HeroFeatureId | null {
  for (const range of FOCUS_RANGES) {
    if (progress >= range.start && progress < range.end) return range.id;
  }
  return null;
}

function focusStrength(progress: number, id: HeroFeatureId): number {
  const range = FOCUS_RANGES.find((r) => r.id === id);
  if (!range) return 0;
  const mid = (range.start + range.end) / 2;
  const half = (range.end - range.start) / 2;
  const d = Math.abs(progress - mid);
  if (d >= half) return 0;
  return 1 - d / half;
}

function orbitPoint(angleDeg: number, rx: number, ry: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * rx,
    y: Math.sin(rad) * ry,
  };
}

function GrinderDisc({
  rotate,
  staticMode,
  dimmed,
}: {
  rotate: MotionValue<number>;
  staticMode: boolean;
  dimmed: MotionValue<number>;
}) {
  const opacity = useTransform(dimmed, (d) => 1 - d * 0.35);

  return (
    <motion.div
      className="batimumHero__grinderDisc"
      style={staticMode ? { opacity: 1 } : { rotate, opacity }}
      transformTemplate={({ rotate: r }) =>
        `translate(-50%, -50%) rotate(${r ?? 0})`
      }
      aria-hidden="true"
    >
      <svg
        className="batimumHero__grinderSvg"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="200"
          cy="200"
          r="188"
          stroke="rgba(17,17,17,0.08)"
          strokeWidth="1.2"
        />
        <circle
          cx="200"
          cy="200"
          r="176"
          stroke="rgba(59,130,246,0.1)"
          strokeWidth="0.9"
        />
        <circle
          cx="200"
          cy="200"
          r="158"
          stroke="rgba(17,17,17,0.06)"
          strokeWidth="1"
        />
        <circle
          cx="200"
          cy="200"
          r="138"
          stroke="rgba(17,17,17,0.055)"
          strokeWidth="0.9"
        />
        <circle
          cx="200"
          cy="200"
          r="118"
          stroke="rgba(59,130,246,0.09)"
          strokeWidth="0.8"
        />
        <circle
          cx="200"
          cy="200"
          r="98"
          stroke="rgba(17,17,17,0.06)"
          strokeWidth="0.9"
        />
        <circle
          cx="200"
          cy="200"
          r="78"
          stroke="rgba(17,17,17,0.05)"
          strokeWidth="0.8"
        />
        {Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2;
          return (
            <line
              key={`seg-${i}`}
              x1={200 + Math.cos(a) * 148}
              y1={200 + Math.sin(a) * 148}
              x2={200 + Math.cos(a) * 172}
              y2={200 + Math.sin(a) * 172}
              stroke={
                i % 4 === 0
                  ? "rgba(59,130,246,0.1)"
                  : "rgba(17,17,17,0.055)"
              }
              strokeWidth="1"
              strokeLinecap="round"
            />
          );
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
          return (
            <line
              key={`notch-${i}`}
              x1={200 + Math.cos(a) * 86}
              y1={200 + Math.sin(a) * 86}
              x2={200 + Math.cos(a) * 104}
              y2={200 + Math.sin(a) * 104}
              stroke="rgba(17,17,17,0.06)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          );
        })}
        <circle
          cx="200"
          cy="200"
          r="36"
          stroke="rgba(17,17,17,0.07)"
          strokeWidth="1"
        />
        <circle
          cx="200"
          cy="200"
          r="22"
          stroke="rgba(59,130,246,0.1)"
          strokeWidth="0.9"
        />
        <circle
          cx="200"
          cy="200"
          r="8"
          stroke="rgba(17,17,17,0.08)"
          strokeWidth="1"
        />
      </svg>
    </motion.div>
  );
}

function OrbitingCard({
  card,
  rx,
  ry,
  reverse,
  orbitRotate,
  scrollProgress,
  sceneSize,
  staticMode,
}: {
  card: OrbitCard;
  rx: number;
  ry: number;
  reverse: boolean;
  orbitRotate: MotionValue<number>;
  scrollProgress: MotionValue<number>;
  sceneSize: number;
  staticMode: boolean;
}) {
  const Icon = card.Icon;
  const base = card.angle;
  const halfScene = sceneSize / 2;
  /** Marge intérieure scène (bulles ne doivent pas approcher le bord < 28px). */
  const edgeLimit = Math.max(0, halfScene - 28 - BUBBLE_HALF_W);

  const orbitX = useTransform(orbitRotate, (r) => {
    const deg = reverse ? -r + base : r + base;
    return orbitPoint(deg, rx, ry).x;
  });
  const orbitY = useTransform(orbitRotate, (r) => {
    const deg = reverse ? -r + base : r + base;
    return orbitPoint(deg, rx, ry).y;
  });

  /**
   * Focus : nudge radial extérieur uniquement (≤28px), scale ≤ 1.08.
   * Pas de trajet vers le centre — évite logo + collisions entre bulles.
   */
  const focusedPos = useTransform(
    [orbitX, orbitY, scrollProgress],
    ([oxRaw, oyRaw, p]) => {
      const ox = Number(oxRaw);
      const oy = Number(oyRaw);
      const t = focusStrength(Number(p), card.id);
      if (t <= 0) return { x: ox, y: oy };

      const len = Math.hypot(ox, oy) || 1;
      const nudge = FOCUS_NUDGE_MAX * t;
      let nx = ox + (ox / len) * nudge;
      let ny = oy + (oy / len) * nudge;

      const maxR = edgeLimit;
      const nr = Math.hypot(nx, ny);
      if (nr > maxR && nr > 0) {
        const s = maxR / nr;
        nx *= s;
        ny *= s;
      }

      const minDist = LOGO_HALF + 36 + BUBBLE_HALF_W * 0.55;
      const dist = Math.hypot(nx, ny);
      if (dist < minDist && dist > 0) {
        const s = minDist / dist;
        nx *= s;
        ny *= s;
      }

      return { x: nx, y: ny };
    },
  );
  const x = useTransform(focusedPos, (pos) => pos.x);
  const y = useTransform(focusedPos, (pos) => pos.y);
  const scale = useTransform(scrollProgress, (p) => {
    const t = focusStrength(p, card.id);
    if (t > 0) return 1 + 0.08 * t;
    return 1;
  });
  const opacity = useTransform(scrollProgress, (p) => {
    const t = focusStrength(p, card.id);
    const anyFocus = activeFeatureAt(p) !== null;
    if (t > 0) return 1;
    if (anyFocus) return 0.4;
    return 1;
  });
  const zIndex = useTransform(scrollProgress, (p) =>
    focusStrength(p, card.id) > 0.12 ? 30 : 10,
  );

  const bubble = (
    <article
      className={`batimumHero__bubble ${card.floatClass}`}
      style={{ "--card-accent": card.accent } as CSSProperties}
    >
      <span className="batimumHero__bubbleIcon" aria-hidden>
        <Icon size={16} strokeWidth={1.8} />
      </span>
      <span className="batimumHero__bubbleCopy">
        <span className="batimumHero__bubbleTitle">{card.title}</span>
        <span className="batimumHero__bubbleSub">{card.subtitle}</span>
      </span>
    </article>
  );

  if (staticMode) {
    const pt = orbitPoint(base, rx, ry);
    return (
      <div
        className="batimumHero__bubbleWrap"
        style={{
          transform: `translate(-50%, -50%) translate(${pt.x}px, ${pt.y}px)`,
        }}
      >
        {bubble}
      </div>
    );
  }

  return (
    <motion.div
      className="batimumHero__bubbleWrap batimumHero__bubbleWrap--live"
      style={{ x, y, scale, opacity, zIndex }}
      transformTemplate={({ x: tx, y: ty, scale: s }) =>
        `translate(-50%, -50%) translate(${tx}, ${ty}) scale(${s})`
      }
      transition={{ duration: 0.2 }}
    >
      {bubble}
    </motion.div>
  );
}

type LandingHeroOrbitProps = {
  scrollProgress: MotionValue<number>;
  enableOrbit: boolean;
};

export function LandingHeroOrbit({
  scrollProgress,
  enableOrbit,
}: LandingHeroOrbitProps) {
  const reduced = useReducedMotion() ?? false;
  const sceneRef = useRef<HTMLDivElement>(null);
  const sceneSize = useSceneSize(sceneRef);
  const [mounted, setMounted] = useState(false);

  const rotate0 = useMotionValue(0);
  const rotate1 = useMotionValue(0);
  const rotate2 = useMotionValue(0);
  const discRotate = useMotionValue(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!enableOrbit || reduced || !mounted) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = scrollProgress.get();

      // Slow → full stop before focus; resume gently after
      let speed = 1;
      if (p >= 0.1 && p < 0.24) speed = 1 - ((p - 0.1) / 0.14);
      else if (p >= 0.24 && p < 0.94) speed = 0;
      else if (p >= 0.94) speed = 0.28;

      let discSpeed = 1;
      if (p >= 0.1 && p < 0.24) discSpeed = 1 - ((p - 0.1) / 0.14) * 0.7;
      else if (p >= 0.24 && p < 0.94) discSpeed = 0.18;
      else if (p >= 0.94) discSpeed = 0.5;

      ORBIT_CFG.forEach((cfg, i) => {
        const mv = [rotate0, rotate1, rotate2][i];
        const delta =
          (360 / cfg.duration) * dt * speed * (cfg.reverse ? -1 : 1);
        mv.set((mv.get() + delta) % 360);
      });

      discRotate.set(
        (discRotate.get() + (360 / DISC_DURATION) * dt * discSpeed) % 360,
      );

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    discRotate,
    enableOrbit,
    mounted,
    reduced,
    rotate0,
    rotate1,
    rotate2,
    scrollProgress,
  ]);

  const discDim = useTransform(
    scrollProgress,
    (p): number => (activeFeatureAt(p) ? 1 : 0),
  );

  const staticMode = !mounted || reduced || !enableOrbit;
  const [detailText, setDetailText] = useState("");
  const detailOpacity = useTransform(scrollProgress, (p) =>
    activeFeatureAt(p) ? 1 : 0,
  );

  useEffect(() => {
    return scrollProgress.on("change", (p) => {
      const id = activeFeatureAt(p);
      setDetailText(
        id ? (HERO_FEATURES.find((f) => f.id === id)?.detail ?? "") : "",
      );
    });
  }, [scrollProgress]);

  const orbitRotates = [rotate0, rotate1, rotate2];
  const scale = Math.min(1, sceneSize / BASE_SCENE);

  return (
    <div className="batimumHero__orbitRoot">
      <motion.div ref={sceneRef} className="batimumHero__scene">
        <div className="batimumHero__center" aria-hidden />
        <div className="batimumHero__glow" aria-hidden />

        <GrinderDisc
          rotate={discRotate}
          staticMode={staticMode}
          dimmed={discDim}
        />

        <div className="batimumHero__logoCore">
          <div className="batimumHero__logoPad batimumHero__logoPad--breathe">
            <img
              src="/logo-batimum.png"
              alt="Batimum"
              className="batimumHero__logoImg"
              width={88}
              height={22}
              decoding="async"
            />
          </div>
        </div>

        {HERO_FEATURES.map((card) => {
          const cfg = ORBIT_CFG[card.orbit];
          return (
            <OrbitingCard
              key={card.id}
              card={card}
              rx={cfg.rx * scale}
              ry={cfg.ry * scale}
              reverse={cfg.reverse}
              orbitRotate={orbitRotates[card.orbit]}
              scrollProgress={scrollProgress}
              sceneSize={sceneSize}
              staticMode={staticMode}
            />
          );
        })}

        <motion.p
          className="batimumHero__focus"
          style={{ opacity: detailOpacity }}
          aria-live="polite"
        >
          {detailText}
        </motion.p>
      </motion.div>
    </div>
  );
}

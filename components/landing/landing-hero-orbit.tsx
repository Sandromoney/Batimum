"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
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

export const HERO_FEATURES: OrbitCard[] = [
  {
    id: "facturation",
    title: "Facturation",
    subtitle: "Simple et rapide",
    detail: "Transformez vos devis en factures simplement.",
    orbit: 2,
    angle: 15,
    accent: ICON_ACCENT,
    Icon: Receipt,
    floatClass: "batimumHero__bubble--floatA",
  },
  {
    id: "clients",
    title: "Clients centralisés",
    subtitle: "Tout au même endroit",
    detail: "Retrouvez toutes les informations au même endroit.",
    orbit: 2,
    angle: 190,
    accent: ICON_ACCENT,
    Icon: Users,
    floatClass: "batimumHero__bubble--floatB",
  },
  {
    id: "planning",
    title: "Planning des équipes",
    subtitle: "Équipes toujours organisées",
    detail: "Organisez vos équipes en quelques clics.",
    orbit: 1,
    angle: 80,
    accent: ICON_ACCENT,
    Icon: CalendarDays,
    floatClass: "batimumHero__bubble--floatC",
  },
  {
    id: "devis",
    title: "Devis avec IA",
    subtitle: "Créés en quelques minutes",
    detail: "Décrivez les travaux, Batimum prépare le devis.",
    orbit: 1,
    angle: 260,
    accent: ICON_ACCENT,
    Icon: Sparkles,
    floatClass: "batimumHero__bubble--floatD",
  },
  {
    id: "chantiers",
    title: "Suivi des chantiers",
    subtitle: "Avancement en temps réel",
    detail: "Suivez l’avancement depuis le bureau ou le terrain.",
    orbit: 0,
    angle: 140,
    accent: ICON_ACCENT,
    Icon: Building2,
    floatClass: "batimumHero__bubble--floatE",
  },
  {
    id: "pilotage",
    title: "Pilotage et rentabilité",
    subtitle: "Marges et coûts sous contrôle",
    detail: "Visualisez vos marges avant qu’il ne soit trop tard.",
    orbit: 0,
    angle: 320,
    accent: ICON_ACCENT,
    Icon: LayoutDashboard,
    floatClass: "batimumHero__bubble--floatF",
  },
];

/** Scroll focus order: Devis → Clients → Planning → Chantiers → Pilotage → Facturation */
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

const ORBIT_CFG = [
  /** Radii calibrated for ~820–900px scene (inner / mid / outer). */
  { radiusPx: 205, duration: 28, reverse: false },
  { radiusPx: 270, duration: 34, reverse: true },
  { radiusPx: 340, duration: 42, reverse: false },
] as const;

/** Full rotation of the grinder disc background (seconds). */
const DISC_DURATION = 62;

function useSceneSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState(820);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize(entry.contentRect.width || 820);
    });
    ro.observe(el);
    setSize(el.clientWidth || 820);
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
      aria-hidden="true"
    >
      <svg
        className="batimumHero__grinderSvg"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer rim */}
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
        {/* Concentric rings */}
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
        {/* Diamond-disc radial segments (subtle slots) */}
        {Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2;
          const x1 = 200 + Math.cos(a) * 148;
          const y1 = 200 + Math.sin(a) * 148;
          const x2 = 200 + Math.cos(a) * 172;
          const y2 = 200 + Math.sin(a) * 172;
          return (
            <line
              key={`seg-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
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
        {/* Inner technical notches */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
          const x1 = 200 + Math.cos(a) * 86;
          const y1 = 200 + Math.sin(a) * 86;
          const x2 = 200 + Math.cos(a) * 104;
          const y2 = 200 + Math.sin(a) * 104;
          return (
            <line
              key={`notch-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(17,17,17,0.06)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          );
        })}
        {/* Hub */}
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
  radiusPx,
  reverse,
  orbitRotate,
  scrollProgress,
  sceneSize,
  staticMode,
}: {
  card: OrbitCard;
  radiusPx: number;
  reverse: boolean;
  orbitRotate: MotionValue<number>;
  scrollProgress: MotionValue<number>;
  sceneSize: number;
  staticMode: boolean;
  index: number;
}) {
  const Icon = card.Icon;
  const base = card.angle;

  const orbitX = useTransform(orbitRotate, (r) => {
    const deg = reverse ? -r + base : r + base;
    return Math.cos((deg * Math.PI) / 180) * radiusPx;
  });
  const orbitY = useTransform(orbitRotate, (r) => {
    const deg = reverse ? -r + base : r + base;
    return Math.sin((deg * Math.PI) / 180) * radiusPx;
  });

  const focusX = sceneSize * 0.22;
  const focusY = -sceneSize * 0.02;

  const x = useTransform([orbitX, scrollProgress], ([ox, p]) => {
    const t = focusStrength(Number(p), card.id);
    return Number(ox) + (focusX - Number(ox)) * t;
  });
  const y = useTransform([orbitY, scrollProgress], ([oy, p]) => {
    const t = focusStrength(Number(p), card.id);
    return Number(oy) + (focusY - Number(oy)) * t;
  });
  const scale = useTransform(scrollProgress, (p) => {
    const t = focusStrength(p, card.id);
    const anyFocus = activeFeatureAt(p) !== null;
    if (t > 0) return 1 + 0.12 * t;
    if (anyFocus) return 0.98;
    return 1;
  });
  const opacity = useTransform(scrollProgress, (p) => {
    const t = focusStrength(p, card.id);
    const anyFocus = activeFeatureAt(p) !== null;
    if (t > 0) return 1;
    if (anyFocus) return 0.38;
    return 1;
  });
  const zIndex = useTransform(scrollProgress, (p) =>
    focusStrength(p, card.id) > 0.12 ? 20 : 4,
  );

  const bubble = (
    <article
      className={`batimumHero__bubble ${card.floatClass}`}
      style={{ "--card-accent": card.accent } as CSSProperties}
    >
      <span className="batimumHero__bubbleIcon" aria-hidden>
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <span className="batimumHero__bubbleCopy">
        <span className="batimumHero__bubbleTitle">{card.title}</span>
        <span className="batimumHero__bubbleSub">{card.subtitle}</span>
      </span>
    </article>
  );

  if (staticMode) {
    const rad = (base * Math.PI) / 180;
    return (
      <div
        className="batimumHero__bubbleWrap"
        style={{
          transform: `translate(-50%, -50%) translate(${Math.cos(rad) * radiusPx}px, ${Math.sin(rad) * radiusPx}px)`,
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
      transition={{ duration: 0.18 }}
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
      let speed = 1;
      if (p >= 0.12 && p < 0.24) speed = 1 - ((p - 0.12) / 0.12) * 0.95;
      else if (p >= 0.24 && p < 0.94) speed = 0.04;
      else if (p >= 0.94) speed = 0.3;

      // Disc slows more gently than bubbles during focus
      let discSpeed = 1;
      if (p >= 0.12 && p < 0.24) discSpeed = 1 - ((p - 0.12) / 0.12) * 0.55;
      else if (p >= 0.24 && p < 0.94) discSpeed = 0.22;
      else if (p >= 0.94) discSpeed = 0.55;

      ORBIT_CFG.forEach((cfg, i) => {
        const mv = [rotate0, rotate1, rotate2][i];
        const delta =
          (360 / cfg.duration) * dt * speed * (cfg.reverse ? -1 : 1);
        mv.set((mv.get() + delta) % 360);
      });

      // Clockwise disc rotation
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

  const sceneScale = useTransform(
    scrollProgress,
    [0, 0.12, 0.24, 0.94, 1],
    [1, 1, 1.06, 1.04, 1],
  );
  const smoothScale = useSpring(sceneScale, {
    stiffness: 90,
    damping: 24,
    mass: 0.8,
  });

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

  return (
    <div className="batimumHero__orbitRoot">
      <motion.div
        ref={sceneRef}
        className="batimumHero__orbit"
        style={staticMode ? undefined : { scale: smoothScale }}
      >
        <div className="batimumHero__glow" aria-hidden />

        <GrinderDisc
          rotate={discRotate}
          staticMode={staticMode}
          dimmed={discDim}
        />

        <div className="batimumHero__logoCore">
          <div className="batimumHero__logoPad batimumHero__logoPad--breathe">
            {/* Same asset + ratio as top bar (.landing-header-logo = 115px contain) */}
            <img
              src="/logo-batimum.png"
              alt="Batimum"
              className="batimumHero__logoImg"
              width={115}
              height={29}
              decoding="async"
            />
          </div>
        </div>

        {HERO_FEATURES.map((card, index) => {
          const cfg = ORBIT_CFG[card.orbit];
          const scale = Math.min(1, (sceneSize / 2 - 110) / 340);
          return (
            <OrbitingCard
              key={card.id}
              card={card}
              radiusPx={cfg.radiusPx * scale}
              reverse={cfg.reverse}
              orbitRotate={orbitRotates[card.orbit]}
              scrollProgress={scrollProgress}
              sceneSize={sceneSize}
              staticMode={staticMode}
              index={index}
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

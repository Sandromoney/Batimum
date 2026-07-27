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

type HexFeature = {
  id: HeroFeatureId;
  title: string;
  subtitle: string;
  detail: string;
  /** Angle fixe sur un sommet de l’hexagone (0, 60, …, 300). */
  angle: number;
  accent: string;
  Icon: typeof Sparkles;
};

const ICON_ACCENT = "#3B82F6";

/**
 * Une fonctionnalité par sommet de l’écrou (flat-top, tous les 60°).
 * Ordre brief : Devis → Planning → Chantiers → Facturation → Clients → Pilotage.
 */
export const HERO_FEATURES: HexFeature[] = [
  {
    id: "devis",
    title: "Devis avec IA",
    subtitle: "Créés en quelques minutes",
    detail: "Décrivez les travaux, Batimum prépare le devis.",
    angle: 0,
    accent: ICON_ACCENT,
    Icon: Sparkles,
  },
  {
    id: "planning",
    title: "Planning des équipes",
    subtitle: "Organisation claire",
    detail: "Organisez vos équipes en quelques clics.",
    angle: 60,
    accent: ICON_ACCENT,
    Icon: CalendarDays,
  },
  {
    id: "chantiers",
    title: "Suivi des chantiers",
    subtitle: "Avancement maîtrisé",
    detail: "Suivez l’avancement depuis le bureau ou le terrain.",
    angle: 120,
    accent: ICON_ACCENT,
    Icon: Building2,
  },
  {
    id: "facturation",
    title: "Facturation",
    subtitle: "Devis → facture",
    detail: "Transformez vos devis en factures simplement.",
    angle: 180,
    accent: ICON_ACCENT,
    Icon: Receipt,
  },
  {
    id: "clients",
    title: "Clients centralisés",
    subtitle: "Historique complet",
    detail: "Retrouvez toutes les informations au même endroit.",
    angle: 240,
    accent: ICON_ACCENT,
    Icon: Users,
  },
  {
    id: "pilotage",
    title: "Pilotage et rentabilité",
    subtitle: "Marge suivie en direct",
    detail: "Visualisez vos marges avant qu’il ne soit trop tard.",
    angle: 300,
    accent: ICON_ACCENT,
    Icon: LayoutDashboard,
  },
];

/** Scroll focus séquentiel des 6 sommets. */
export const FOCUS_RANGES: {
  id: HeroFeatureId | null;
  start: number;
  end: number;
}[] = [
  { id: null, start: 0, end: 0.22 },
  { id: "devis", start: 0.22, end: 0.34 },
  { id: "planning", start: 0.34, end: 0.46 },
  { id: "chantiers", start: 0.46, end: 0.58 },
  { id: "facturation", start: 0.58, end: 0.7 },
  { id: "clients", start: 0.7, end: 0.82 },
  { id: "pilotage", start: 0.82, end: 0.94 },
  { id: null, start: 0.94, end: 1 },
];

/** Scène de référence (CSS: min(840px, 52vw)). */
const BASE_SCENE = 840;
/** Écrou = 78% scène ; sommets SVG à r=188/200 → rayon bulles = scène × 0.3666 */
const NUT_SIZE_RATIO = 0.78;
const NUT_VERTEX_SVG = 188 / 200;
/** Tour complet écrou + bulles (s). */
const SYSTEM_DURATION = 80;

function vertexRadiusForScene(sceneSize: number) {
  return sceneSize * NUT_SIZE_RATIO * 0.5 * NUT_VERTEX_SVG;
}

/** Asset top bar — symbole BM = portion gauche (~224×210 sur 829×210). */
export const HERO_BM_SYMBOL_SRC = "/logo-batimum.png";
const BM_SYMBOL_SRC_W = 829;
const BM_SYMBOL_MARK_W = 224;
const BM_SYMBOL_SRC_H = 210;

function useSceneSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState(BASE_SCENE);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize(entry.contentRect.width || BASE_SCENE);
    });
    ro.observe(el);
    setSize(el.clientWidth || BASE_SCENE);
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

function vertexPoint(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  };
}

/** Hexagone flat-top : sommets à 0°, 60°, …, 300° — alignés sur les bulles. */
function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (i * 60);
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(" ");
}

/**
 * Écrou hexagonal flat-top — plus identifiable, toujours premium / léger.
 * Les 6 sommets correspondent exactement aux angles des fonctionnalités.
 */
function HeroNutSvg() {
  const outer = hexPoints(200, 200, 188);
  const mid = hexPoints(200, 200, 172);
  const inner = hexPoints(200, 200, 158);

  return (
    <svg
      className="batimumHero__nutSvg"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ombre de forme très légère */}
      <polygon
        points={outer}
        fill="rgba(17,17,17,0.015)"
        stroke="none"
      />
      {/* Contour hexagonal principal */}
      <polygon
        points={outer}
        stroke="rgba(17,17,17,0.10)"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      {/* Deuxième contour */}
      <polygon
        points={mid}
        stroke="rgba(17,17,17,0.055)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      {/* Pans internes subtils */}
      <polygon
        points={inner}
        stroke="rgba(17,17,17,0.035)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Différence d’opacité très légère entre pans (fill triangulaire) */}
      {Array.from({ length: 6 }, (_, i) => {
        const a0 = (Math.PI / 180) * (i * 60);
        const a1 = (Math.PI / 180) * ((i + 1) * 60);
        const x0 = 200 + Math.cos(a0) * 165;
        const y0 = 200 + Math.sin(a0) * 165;
        const x1 = 200 + Math.cos(a1) * 165;
        const y1 = 200 + Math.sin(a1) * 165;
        return (
          <polygon
            key={`pan-${i}`}
            points={`200,200 ${x0},${y0} ${x1},${y1}`}
            fill={
              i % 2 === 0
                ? "rgba(17,17,17,0.012)"
                : "rgba(59,130,246,0.018)"
            }
            stroke="none"
          />
        );
      })}
      {/* Anneaux techniques */}
      <circle
        cx="200"
        cy="200"
        r="112"
        stroke="rgba(17,17,17,0.04)"
        strokeWidth="1"
      />
      <circle
        cx="200"
        cy="200"
        r="94"
        stroke="rgba(59,130,246,0.10)"
        strokeWidth="1.05"
      />
      <circle
        cx="200"
        cy="200"
        r="78"
        stroke="rgba(17,17,17,0.045)"
        strokeWidth="0.95"
      />
      {/* Trou central */}
      <circle
        cx="200"
        cy="200"
        r="54"
        stroke="rgba(17,17,17,0.09)"
        strokeWidth="1.35"
      />
      <circle
        cx="200"
        cy="200"
        r="46"
        stroke="rgba(17,17,17,0.04)"
        strokeWidth="0.9"
      />
      {/* Lignes radiales vers sommets */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (i * 60);
        return (
          <line
            key={`spoke-${i}`}
            x1={200 + Math.cos(a) * 54}
            y1={200 + Math.sin(a) * 54}
            x2={200 + Math.cos(a) * 158}
            y2={200 + Math.sin(a) * 158}
            stroke={
              i % 2 === 0
                ? "rgba(59,130,246,0.10)"
                : "rgba(17,17,17,0.045)"
            }
            strokeWidth="0.95"
            strokeLinecap="round"
          />
        );
      })}
      {/* Repères aux 6 sommets */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (i * 60);
        return (
          <g key={`vertex-${i}`}>
            <circle
              cx={200 + Math.cos(a) * 188}
              cy={200 + Math.sin(a) * 188}
              r="2.4"
              fill="rgba(17,17,17,0.08)"
            />
            <line
              x1={200 + Math.cos(a) * 178}
              y1={200 + Math.sin(a) * 178}
              x2={200 + Math.cos(a) * 188}
              y2={200 + Math.sin(a) * 188}
              stroke="rgba(17,17,17,0.08)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>
        );
      })}
      {/* Trait supérieur / inférieur (volume discret) */}
      <path
        d={`M ${200 + Math.cos(0) * 188} ${200 + Math.sin(0) * 188}
            L ${200 + Math.cos(Math.PI / 3) * 188} ${200 + Math.sin(Math.PI / 3) * 188}`}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d={`M ${200 + Math.cos(Math.PI) * 188} ${200 + Math.sin(Math.PI) * 188}
            L ${200 + Math.cos((4 * Math.PI) / 3) * 188} ${200 + Math.sin((4 * Math.PI) / 3) * 188}`}
        stroke="rgba(17,17,17,0.06)"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FeatureVertexCard({
  feature,
  radius,
  systemRotate,
  scrollProgress,
  staticMode,
}: {
  feature: HexFeature;
  radius: number;
  systemRotate: MotionValue<number>;
  scrollProgress: MotionValue<number>;
  staticMode: boolean;
}) {
  const Icon = feature.Icon;
  const pt = vertexPoint(feature.angle, radius);

  const counterRotate = useTransform(systemRotate, (r) => -r);
  const scale = useTransform(scrollProgress, (p) => {
    const t = focusStrength(p, feature.id);
    return t > 0 ? 1 + 0.08 * t : 1;
  });
  const opacity = useTransform(scrollProgress, (p) => {
    const t = focusStrength(p, feature.id);
    const any = activeFeatureAt(p) !== null;
    if (t > 0) return 1;
    if (any) return 0.38;
    return 1;
  });
  const zIndex = useTransform(scrollProgress, (p) =>
    focusStrength(p, feature.id) > 0.12 ? 30 : 10,
  );

  const card = (
    <article
      className="batimumHero__featureCard batimumHero__bubble"
      style={{ "--card-accent": feature.accent } as CSSProperties}
    >
      <span className="batimumHero__bubbleIcon" aria-hidden>
        <Icon size={16} strokeWidth={1.8} />
      </span>
      <span className="batimumHero__bubbleCopy">
        <span className="batimumHero__bubbleTitle">{feature.title}</span>
        <span className="batimumHero__bubbleSub">{feature.subtitle}</span>
      </span>
    </article>
  );

  if (staticMode) {
    return (
      <div
        className="batimumHero__featureAnchor batimumHero__nutVertex"
        style={{
          transform: `translate(-50%, -50%) translate(${pt.x}px, ${pt.y}px)`,
        }}
      >
        {card}
      </div>
    );
  }

  return (
    <motion.div
      className="batimumHero__featureAnchor batimumHero__nutVertex"
      style={{
        x: pt.x,
        y: pt.y,
        rotate: counterRotate,
        scale,
        opacity,
        zIndex,
      }}
      transformTemplate={({ x: tx, y: ty, rotate: r, scale: s }) =>
        `translate(-50%, -50%) translate(${tx}, ${ty}) rotate(${r ?? 0}) scale(${s})`
      }
    >
      {card}
    </motion.div>
  );
}

type LandingHeroOrbitProps = {
  scrollProgress: MotionValue<number>;
  enableOrbit: boolean;
};

/**
 * Système hexagonal unique :
 * - un wrapper rotatif = écrou + 6 bulles aux sommets
 * - contre-rotation des bulles → texte toujours horizontal
 * - logo BM fixe au centre (hors wrapper)
 */
export function LandingHeroOrbit({
  scrollProgress,
  enableOrbit,
}: LandingHeroOrbitProps) {
  const reduced = useReducedMotion() ?? false;
  const sceneRef = useRef<HTMLDivElement>(null);
  const sceneSize = useSceneSize(sceneRef);
  const [mounted, setMounted] = useState(false);
  const systemRotate = useMotionValue(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!enableOrbit || reduced || !mounted) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = scrollProgress.get();

      // Ralentir → arrêter pendant le focus → reprise lente
      let speed = 1;
      if (p >= 0.1 && p < 0.22) speed = 1 - (p - 0.1) / 0.12;
      else if (p >= 0.22 && p < 0.94) speed = 0;
      else if (p >= 0.94) speed = 0.35;

      systemRotate.set(
        (systemRotate.get() + (360 / SYSTEM_DURATION) * dt * speed) % 360,
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enableOrbit, mounted, reduced, scrollProgress, systemRotate]);

  const staticMode = !mounted || reduced || !enableOrbit;
  const radius = vertexRadiusForScene(sceneSize);

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

  return (
    <div className="batimumHero__orbitRoot">
      <div ref={sceneRef} className="batimumHero__scene">
        <div className="batimumHero__center" aria-hidden />
        <div className="batimumHero__glow" aria-hidden />

        <motion.div
          className="batimumHero__rotatingNutSystem"
          style={staticMode ? undefined : { rotate: systemRotate }}
          transformTemplate={({ rotate: r }) =>
            `translate(-50%, -50%) rotate(${r ?? 0})`
          }
        >
          <div className="batimumHero__nut" aria-hidden="true">
            <HeroNutSvg />
          </div>

          {HERO_FEATURES.map((feature) => (
            <FeatureVertexCard
              key={feature.id}
              feature={feature}
              radius={radius}
              systemRotate={systemRotate}
              scrollProgress={scrollProgress}
              staticMode={staticMode}
            />
          ))}
        </motion.div>

        {/* Logo fixe — ne tourne jamais */}
        <div className="batimumHero__logoCore">
          <div
            className="batimumHero__logoSymbol batimumHero__logoSymbol--breathe"
            aria-label="Batimum"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_BM_SYMBOL_SRC}
              alt="Batimum"
              className="batimumHero__logoSymbolImg"
              width={BM_SYMBOL_SRC_W}
              height={BM_SYMBOL_SRC_H}
              decoding="async"
              style={
                {
                  ["--bm-src-w" as string]: BM_SYMBOL_SRC_W,
                  ["--bm-mark-w" as string]: BM_SYMBOL_MARK_W,
                  ["--bm-src-h" as string]: BM_SYMBOL_SRC_H,
                } as CSSProperties
              }
            />
          </div>
        </div>

        <motion.p
          className="batimumHero__focus"
          style={{ opacity: detailOpacity }}
          aria-live="polite"
        >
          {detailText}
        </motion.p>
      </div>
    </div>
  );
}

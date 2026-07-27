"use client";

import {
  AnimatePresence,
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
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
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
  panelTitle: string;
  panelText: string;
  benefit: string;
  ctaLabel: string;
  href: string;
  angle: number;
  accent: string;
  Icon: LucideIcon;
};

const ICON_ACCENT = "#3B82F6";

/**
 * Une fonctionnalité par sommet (flat-top, tous les 60°).
 * Contenu panneau + ancres landing.
 */
export const HERO_FEATURES: HexFeature[] = [
  {
    id: "devis",
    title: "Devis avec IA",
    subtitle: "Créés en quelques minutes",
    detail: "Décrivez les travaux, Batimum prépare le devis.",
    panelTitle: "Devis avec MUM IA",
    panelText:
      "Décrivez simplement les travaux à réaliser. MUM IA structure les lots, les prestations, les quantités et les prix pour préparer un devis clair en quelques minutes.",
    benefit: "Moins de saisie, plus de rapidité.",
    ctaLabel: "Découvrir les devis avec IA",
    href: "#devis-ia",
    angle: 0,
    accent: ICON_ACCENT,
    Icon: Sparkles,
  },
  {
    id: "planning",
    title: "Planning des équipes",
    subtitle: "Organisation claire",
    detail: "Organisez vos équipes en quelques clics.",
    panelTitle: "Planning des équipes",
    panelText:
      "Planifiez les interventions, affectez les bons collaborateurs et gardez une vision claire des disponibilités de chacun.",
    benefit: "Les bonnes équipes, au bon endroit, au bon moment.",
    ctaLabel: "Voir le planning",
    href: "#planning",
    angle: 60,
    accent: ICON_ACCENT,
    Icon: CalendarDays,
  },
  {
    id: "chantiers",
    title: "Suivi des chantiers",
    subtitle: "Avancement maîtrisé",
    detail: "Suivez l’avancement depuis le bureau ou le terrain.",
    panelTitle: "Suivi des chantiers",
    panelText:
      "Centralisez les étapes, les consignes, les documents et l’avancement de chaque chantier, depuis le bureau comme sur le terrain.",
    benefit: "Tout le monde travaille avec les mêmes informations.",
    ctaLabel: "Découvrir le suivi chantier",
    href: "#chantiers",
    angle: 120,
    accent: ICON_ACCENT,
    Icon: Building2,
  },
  {
    id: "facturation",
    title: "Facturation",
    subtitle: "Devis → facture",
    detail: "Transformez vos devis en factures simplement.",
    panelTitle: "Facturation simplifiée",
    panelText:
      "Transformez vos devis en factures, suivez les paiements et gardez une vision claire de ce qui est encaissé ou encore en attente.",
    benefit: "Une facturation plus simple, sans ressaisie.",
    ctaLabel: "Voir la facturation",
    href: "#facturation",
    angle: 180,
    accent: ICON_ACCENT,
    Icon: Receipt,
  },
  {
    id: "clients",
    title: "Clients centralisés",
    subtitle: "Historique complet",
    detail: "Retrouvez toutes les informations au même endroit.",
    panelTitle: "Gestion client",
    panelText:
      "Retrouvez les coordonnées, les documents, les devis, les factures et l’historique complet de chaque client au même endroit.",
    benefit: "Chaque information reste facile à retrouver.",
    ctaLabel: "Découvrir la gestion client",
    href: "#clients",
    angle: 240,
    accent: ICON_ACCENT,
    Icon: Users,
  },
  {
    id: "pilotage",
    title: "Pilotage et rentabilité",
    subtitle: "Marge suivie en direct",
    detail: "Visualisez vos marges avant qu’il ne soit trop tard.",
    panelTitle: "Pilotage et rentabilité",
    panelText:
      "Comparez le prévu au réel, surveillez vos coûts et visualisez les marges de vos devis et de vos chantiers.",
    benefit: "Prenez vos décisions avec des chiffres clairs.",
    ctaLabel: "Voir le pilotage",
    href: "#pilotage",
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

const BASE_SCENE = 840;
const NUT_SIZE_RATIO = 0.78;
const NUT_VERTEX_SVG = 188 / 200;
const SYSTEM_DURATION = 82;

export const HERO_BM_SYMBOL_SRC = "/logo-batimum.png";
const BM_SYMBOL_SRC_W = 829;
const BM_SYMBOL_MARK_W = 224;
const BM_SYMBOL_SRC_H = 210;

function vertexRadiusForScene(sceneSize: number) {
  return sceneSize * NUT_SIZE_RATIO * 0.5 * NUT_VERTEX_SVG;
}

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
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (i * 60);
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(" ");
}

function scrollToAnchor(href: string) {
  const id = href.replace(/^#/, "");
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Écrou hexagonal flat-top — plus reconnaissable (épaisseur, chanfrein, trou).
 */
function HeroNutSvg() {
  const outer = hexPoints(200, 200, 188);
  const rim = hexPoints(200, 200, 182);
  const mid = hexPoints(200, 200, 168);
  const chamfer = hexPoints(200, 200, 156);
  const face = hexPoints(200, 200, 148);

  return (
    <svg
      className="batimumHero__nutSvg"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Corps — très léger fill pour lire la pièce */}
      <polygon points={outer} fill="rgba(17,17,17,0.018)" stroke="none" />
      {/* Contour extérieur (épaisseur visuelle) */}
      <polygon
        points={outer}
        stroke="rgba(17,17,17,0.12)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <polygon
        points={rim}
        stroke="rgba(17,17,17,0.06)"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Chanfrein / double face */}
      <polygon
        points={mid}
        stroke="rgba(17,17,17,0.07)"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <polygon
        points={chamfer}
        stroke="rgba(59,130,246,0.08)"
        strokeWidth="0.95"
        strokeLinejoin="round"
      />
      <polygon
        points={face}
        stroke="rgba(17,17,17,0.045)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Pans — contraste alterné très discret */}
      {Array.from({ length: 6 }, (_, i) => {
        const a0 = (Math.PI / 180) * (i * 60);
        const a1 = (Math.PI / 180) * ((i + 1) * 60);
        const x0 = 200 + Math.cos(a0) * 160;
        const y0 = 200 + Math.sin(a0) * 160;
        const x1 = 200 + Math.cos(a1) * 160;
        const y1 = 200 + Math.sin(a1) * 160;
        const xi0 = 200 + Math.cos(a0) * 78;
        const yi0 = 200 + Math.sin(a0) * 78;
        const xi1 = 200 + Math.cos(a1) * 78;
        const yi1 = 200 + Math.sin(a1) * 78;
        return (
          <polygon
            key={`pan-${i}`}
            points={`${xi0},${yi0} ${x0},${y0} ${x1},${y1} ${xi1},${yi1}`}
            fill={
              i % 2 === 0
                ? "rgba(17,17,17,0.016)"
                : "rgba(59,130,246,0.022)"
            }
            stroke="rgba(17,17,17,0.03)"
            strokeWidth="0.6"
          />
        );
      })}
      {/* Anneaux concentriques */}
      <circle cx="200" cy="200" r="118" stroke="rgba(17,17,17,0.045)" strokeWidth="1" />
      <circle cx="200" cy="200" r="102" stroke="rgba(17,17,17,0.035)" strokeWidth="0.9" />
      <circle cx="200" cy="200" r="88" stroke="rgba(59,130,246,0.12)" strokeWidth="1.15" />
      {/* Trou central + anneau */}
      <circle cx="200" cy="200" r="58" stroke="rgba(17,17,17,0.09)" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="50" stroke="rgba(17,17,17,0.055)" strokeWidth="1.1" />
      <circle cx="200" cy="200" r="44" stroke="rgba(17,17,17,0.04)" strokeWidth="0.85" />
      {/* Traits radiaux techniques */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (i * 60);
        return (
          <line
            key={`spoke-${i}`}
            x1={200 + Math.cos(a) * 58}
            y1={200 + Math.sin(a) * 58}
            x2={200 + Math.cos(a) * 148}
            y2={200 + Math.sin(a) * 148}
            stroke={
              i % 2 === 0 ? "rgba(59,130,246,0.11)" : "rgba(17,17,17,0.05)"
            }
            strokeWidth="1"
            strokeLinecap="round"
          />
        );
      })}
      {/* Repères sommets + petites marques */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (i * 60);
        const midA = (Math.PI / 180) * (i * 60 + 30);
        return (
          <g key={`mark-${i}`}>
            <circle
              cx={200 + Math.cos(a) * 188}
              cy={200 + Math.sin(a) * 188}
              r="2.6"
              fill="rgba(17,17,17,0.1)"
            />
            <line
              x1={200 + Math.cos(a) * 174}
              y1={200 + Math.sin(a) * 174}
              x2={200 + Math.cos(a) * 188}
              y2={200 + Math.sin(a) * 188}
              stroke="rgba(17,17,17,0.1)"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            {/* Marque au milieu de chaque pan */}
            <line
              x1={200 + Math.cos(midA) * 178}
              y1={200 + Math.sin(midA) * 178}
              x2={200 + Math.cos(midA) * 186}
              y2={200 + Math.sin(midA) * 186}
              stroke="rgba(17,17,17,0.07)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </g>
        );
      })}
      {/* Volume : bord clair / bord sombre */}
      <path
        d={`M ${200 + Math.cos(0) * 188} ${200 + Math.sin(0) * 188}
            L ${200 + Math.cos(Math.PI / 3) * 188} ${200 + Math.sin(Math.PI / 3) * 188}`}
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d={`M ${200 + Math.cos(Math.PI) * 188} ${200 + Math.sin(Math.PI) * 188}
            L ${200 + Math.cos((4 * Math.PI) / 3) * 188} ${200 + Math.sin((4 * Math.PI) / 3) * 188}`}
        stroke="rgba(17,17,17,0.08)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FeaturePanel({
  feature,
  onClose,
  onNavigate,
}: {
  feature: HexFeature;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const Icon = feature.Icon;
  return (
    <motion.div
      className="batimumHero__featurePanel"
      id={`batimum-hero-panel-${feature.id}`}
      role="dialog"
      aria-labelledby={`batimum-hero-panel-title-${feature.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        className="batimumHero__featurePanelClose"
        onClick={onClose}
        aria-label="Fermer"
      >
        <X size={16} strokeWidth={1.8} aria-hidden />
      </button>
      <div className="batimumHero__featurePanelHead">
        <span className="batimumHero__featurePanelIcon" aria-hidden>
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <h3
          id={`batimum-hero-panel-title-${feature.id}`}
          className="batimumHero__featurePanelTitle"
        >
          {feature.panelTitle}
        </h3>
      </div>
      <p className="batimumHero__featurePanelText">{feature.panelText}</p>
      <p className="batimumHero__featurePanelBenefit">{feature.benefit}</p>
      <button
        type="button"
        className="batimumHero__featurePanelCta"
        onClick={onNavigate}
      >
        {feature.ctaLabel}
      </button>
    </motion.div>
  );
}

function FeatureVertexCard({
  feature,
  radius,
  systemRotate,
  scrollProgress,
  staticMode,
  isActive,
  isDimmed,
  pinned,
  onActivate,
  onHoverStart,
  onHoverEnd,
}: {
  feature: HexFeature;
  radius: number;
  systemRotate: MotionValue<number>;
  scrollProgress: MotionValue<number>;
  staticMode: boolean;
  isActive: boolean;
  isDimmed: boolean;
  pinned: boolean;
  onActivate: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const Icon = feature.Icon;
  const pt = vertexPoint(feature.angle, radius);
  const counterRotate = useTransform(systemRotate, (r) => -r);

  const scrollScale = useTransform(scrollProgress, (p) => {
    if (pinned || isActive) return 1;
    const t = focusStrength(p, feature.id);
    return t > 0 ? 1 + 0.08 * t : 1;
  });
  const scrollOpacity = useTransform(scrollProgress, (p) => {
    if (isActive) return 1;
    if (isDimmed) return 0.4;
    const t = focusStrength(p, feature.id);
    const any = activeFeatureAt(p) !== null;
    if (t > 0) return 1;
    if (any) return 0.38;
    return 1;
  });

  const scale = isActive ? 1.06 : undefined;
  const opacity = isActive ? 1 : isDimmed ? 0.4 : undefined;

  const card = (
    <button
      type="button"
      className={`batimumHero__featureButton${isActive ? " is-active" : ""}`}
      aria-expanded={isActive}
      aria-controls={`batimum-hero-panel-${feature.id}`}
      aria-label={`${feature.panelTitle} — en savoir plus`}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
    >
      <span
        className={`batimumHero__featureCard batimumHero__bubble${isActive ? " is-active" : ""}`}
        style={{ "--card-accent": feature.accent } as CSSProperties}
      >
        <span className="batimumHero__bubbleIcon" aria-hidden>
          <Icon size={16} strokeWidth={1.8} />
        </span>
        <span className="batimumHero__bubbleCopy">
          <span className="batimumHero__bubbleTitle">{feature.title}</span>
          <span className="batimumHero__bubbleSub">{feature.subtitle}</span>
        </span>
      </span>
    </button>
  );

  if (staticMode) {
    return (
      <div
        className="batimumHero__featureAnchor batimumHero__nutVertex"
        style={{
          transform: `translate(-50%, -50%) translate(${pt.x}px, ${pt.y}px)`,
          zIndex: isActive ? 30 : 10,
          opacity: opacity ?? 1,
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
        scale: scale ?? scrollScale,
        opacity: opacity ?? scrollOpacity,
        zIndex: isActive ? 30 : 10,
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
 * Système hexagonal interactif :
 * - wrapper rotatif = écrou + 6 bulles
 * - hover / clic → fige + panneau explicatif
 * - logo BM fixe au centre
 */
export function LandingHeroOrbit({
  scrollProgress,
  enableOrbit,
}: LandingHeroOrbitProps) {
  const reduced = useReducedMotion() ?? false;
  const sceneRef = useRef<HTMLDivElement>(null);
  const interactRef = useRef<HTMLDivElement>(null);
  const sceneSize = useSceneSize(sceneRef);
  const [mounted, setMounted] = useState(false);
  const systemRotate = useMotionValue(0);
  const speedFactor = useRef(1);
  const targetSpeed = useRef(1);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeId, setActiveId] = useState<HeroFeatureId | null>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => setMounted(true), []);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const softStop = useCallback(() => {
    targetSpeed.current = 0;
  }, []);

  const softResume = useCallback(() => {
    if (!pinned) targetSpeed.current = 1;
  }, [pinned]);

  const openFeature = useCallback(
    (id: HeroFeatureId, pin: boolean) => {
      clearCloseTimer();
      softStop();
      setActiveId(id);
      if (pin) setPinned(true);
    },
    [softStop],
  );

  const closePanel = useCallback(() => {
    clearCloseTimer();
    setActiveId(null);
    setPinned(false);
    targetSpeed.current = 1;
  }, []);

  const scheduleClose = useCallback(() => {
    if (pinned) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setActiveId(null);
      targetSpeed.current = 1;
    }, 220);
  }, [pinned]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeId) {
        e.preventDefault();
        closePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, closePanel]);

  useEffect(() => {
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!activeId || !interactRef.current) return;
      const target = e.target as Node | null;
      if (target && !interactRef.current.contains(target)) {
        closePanel();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [activeId, closePanel]);

  useEffect(() => {
    if (!enableOrbit || reduced || !mounted) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = scrollProgress.get();

      // Scroll story speed (sauf si interaction active)
      let scrollSpeed = 1;
      if (p >= 0.1 && p < 0.22) scrollSpeed = 1 - (p - 0.1) / 0.12;
      else if (p >= 0.22 && p < 0.94) scrollSpeed = 0;
      else if (p >= 0.94) scrollSpeed = 0.35;

      const desired =
        activeId !== null || pinned
          ? 0
          : targetSpeed.current * scrollSpeed;

      // Ralentissement doux ~400ms
      const lerp = 1 - Math.exp(-dt / 0.38);
      speedFactor.current += (desired - speedFactor.current) * lerp;

      if (speedFactor.current > 0.001) {
        systemRotate.set(
          (systemRotate.get() +
            (360 / SYSTEM_DURATION) * dt * speedFactor.current) %
            360,
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    activeId,
    enableOrbit,
    mounted,
    pinned,
    reduced,
    scrollProgress,
    systemRotate,
  ]);

  const staticMode = !mounted || reduced || !enableOrbit;
  const radius = vertexRadiusForScene(sceneSize);
  const activeFeature = HERO_FEATURES.find((f) => f.id === activeId) ?? null;

  const handleNavigate = () => {
    if (!activeFeature) return;
    const href = activeFeature.href;
    closePanel();
    // Laisse le panneau se fermer avant le scroll
    requestAnimationFrame(() => scrollToAnchor(href));
  };

  return (
    <div className="batimumHero__orbitRoot" ref={interactRef}>
      <div ref={sceneRef} className="batimumHero__scene">
        <div className="batimumHero__center" aria-hidden />
        <div className="batimumHero__glow" aria-hidden />

        <motion.div
          className="batimumHero__nutSystem batimumHero__rotatingNutSystem"
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
              isActive={activeId === feature.id}
              isDimmed={activeId !== null && activeId !== feature.id}
              pinned={pinned}
              onActivate={() => openFeature(feature.id, true)}
              onHoverStart={() => {
                if (window.matchMedia("(hover: hover)").matches) {
                  openFeature(feature.id, false);
                }
              }}
              onHoverEnd={() => {
                if (window.matchMedia("(hover: hover)").matches) {
                  scheduleClose();
                }
              }}
            />
          ))}
        </motion.div>

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
      </div>

      <div
        className="batimumHero__panelSlot"
        onMouseEnter={() => {
          clearCloseTimer();
          softStop();
        }}
        onMouseLeave={() => scheduleClose()}
      >
        <AnimatePresence mode="wait">
          {activeFeature ? (
            <FeaturePanel
              key={activeFeature.id}
              feature={activeFeature}
              onClose={closePanel}
              onNavigate={handleNavigate}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

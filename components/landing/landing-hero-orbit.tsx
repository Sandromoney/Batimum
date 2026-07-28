"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  animate,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  HardHat,
  LineChart,
  Receipt,
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
  type FocusEvent,
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
    title: "Devis avec MUM IA",
    subtitle: "Prêts en quelques minutes",
    detail: "Décrivez les travaux, Batimum prépare le devis.",
    panelTitle: "Créez vos devis avec MUM IA",
    panelText:
      "Décrivez les travaux demandés par votre client. MUM IA vous aide à organiser les lots, détailler les prestations et préparer un devis professionnel en quelques minutes.",
    benefit:
      "Vous gagnez du temps dès le rendez-vous client, tout en gardant la main avant l’envoi.",
    ctaLabel: "Découvrir MUM IA",
    href: "#devis-ia",
    angle: 0,
    accent: ICON_ACCENT,
    Icon: Bot,
  },
  {
    id: "planning",
    title: "Planning des équipes",
    subtitle: "Tout le monde au bon endroit",
    detail: "Organisez vos équipes en quelques clics.",
    panelTitle: "Des équipes toujours bien organisées",
    panelText:
      "Planifiez les interventions, affectez chaque salarié au bon chantier et visualisez les disponibilités de toute l’entreprise dans un planning simple et partagé.",
    benefit:
      "Moins d’oublis, moins d’appels et une organisation claire pour toute l’équipe.",
    ctaLabel: "Découvrir le planning",
    href: "#planning",
    angle: 60,
    accent: ICON_ACCENT,
    Icon: Calendar,
  },
  {
    id: "chantiers",
    title: "Suivi des chantiers",
    subtitle: "Gardez toujours le contrôle",
    detail: "Suivez l’avancement depuis le bureau ou le terrain.",
    panelTitle: "Gardez chaque chantier sous contrôle",
    panelText:
      "Suivez les étapes, les consignes, les documents et l’avancement des travaux depuis une seule fiche accessible au bureau comme sur le terrain.",
    benefit:
      "Vos équipes disposent toujours des bonnes informations, au bon moment.",
    ctaLabel: "Découvrir le suivi chantier",
    href: "#chantiers",
    angle: 120,
    accent: ICON_ACCENT,
    Icon: HardHat,
  },
  {
    id: "facturation",
    title: "Facturation simplifiée",
    subtitle: "Du devis au paiement",
    detail: "Transformez vos devis en factures simplement.",
    panelTitle: "Facturez sans tout ressaisir",
    panelText:
      "Transformez rapidement vos devis en factures, suivez les règlements et identifiez ce qui est encaissé ou encore en attente.",
    benefit:
      "Une facturation plus fluide et une vision claire de vos encaissements.",
    ctaLabel: "Découvrir la facturation",
    href: "#facturation",
    angle: 180,
    accent: ICON_ACCENT,
    Icon: Receipt,
  },
  {
    id: "clients",
    title: "Gestion client",
    subtitle: "Tout est facile à retrouver",
    detail: "Retrouvez toutes les informations au même endroit.",
    panelTitle: "Toute l’histoire de chaque client au même endroit",
    panelText:
      "Retrouvez ses coordonnées, ses devis, ses factures, ses documents et les chantiers réalisés ou en cours.",
    benefit:
      "Plus besoin de chercher dans les mails, les dossiers ou les anciens messages.",
    ctaLabel: "Découvrir la gestion client",
    href: "#clients",
    angle: 240,
    accent: ICON_ACCENT,
    Icon: Users,
  },
  {
    id: "pilotage",
    title: "Pilotage et rentabilité",
    subtitle: "Vos marges sous contrôle",
    detail: "Visualisez vos marges avant qu’il ne soit trop tard.",
    panelTitle: "Prenez vos décisions avec les bons chiffres",
    panelText:
      "Comparez le prévu au réel, suivez vos coûts et visualisez la rentabilité de vos devis et de vos chantiers.",
    benefit:
      "Vous savez où votre entreprise gagne de l’argent et où votre marge doit être protégée.",
    ctaLabel: "Découvrir le pilotage",
    href: "#pilotage",
    angle: 300,
    accent: ICON_ACCENT,
    Icon: LineChart,
  },
];

const BASE_SCENE = 840;
const NUT_SIZE_RATIO = 0.8;
const NUT_VERTEX_SVG = 188 / 200;
const AUTO_FEATURE_READ_MS = 5000;
const AUTO_FEATURE_TRANSITION_MS = 650;
const AUTO_FEATURE_STEP_MS = AUTO_FEATURE_READ_MS + AUTO_FEATURE_TRANSITION_MS;
const FEATURE_IDS: HeroFeatureId[] = [
  "devis",
  "planning",
  "chantiers",
  "facturation",
  "clients",
  "pilotage",
];

export const HERO_BM_SYMBOL_SRC = "/logo-batimum.png";
const BM_SYMBOL_SRC_W = 829;
const BM_SYMBOL_MARK_W = 224;
const BM_SYMBOL_SRC_H = 210;

function vertexRadiusForScene(sceneSize: number) {
  const raw = sceneSize * NUT_SIZE_RATIO * 0.5 * NUT_VERTEX_SVG - 12;
  return Math.min(274, Math.max(186, raw));
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

const CLOSE_DELAY_MS = 700;

/**
 * Écrou hexagonal mécanique — blanc translucide, fin, identifiable.
 * Flat-top, centre = logo BM. Épaisseur via face arrière décalée.
 */
function HeroNutSvg() {
  const cx = 200;
  const cy = 200;
  const outerR = 188;
  const midR = 170;
  const innerR = 156;
  const holeR = 54;
  const ringR = 68;
  const chamferR = 78;
  const back = hexPoints(cx + 4.5, cy + 5.5, outerR);
  const outer = hexPoints(cx, cy, outerR);
  const mid = hexPoints(cx, cy, midR);
  const inner = hexPoints(cx, cy, innerR);

  return (
    <svg
      className="batimumHero__nutSvg"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="batimumNutFace" x1="70" y1="60" x2="320" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
        <linearGradient id="batimumNutShine" x1="90" y1="70" x2="210" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id="batimumNutBlue" cx="42%" cy="38%" r="55%">
          <stop offset="0%" stopColor="rgba(59,130,246,0.06)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0)" />
        </radialGradient>
        <radialGradient id="batimumNutHoleShade" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="rgba(17,17,17,0)" />
          <stop offset="70%" stopColor="rgba(17,17,17,0.02)" />
          <stop offset="100%" stopColor="rgba(17,17,17,0.05)" />
        </radialGradient>
      </defs>

      {/* Face arrière — épaisseur légère */}
      <polygon
        points={back}
        fill="rgba(248,250,252,0.22)"
        stroke="rgba(17,17,17,0.055)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />

      {/* Face principale */}
      <polygon
        points={outer}
        fill="url(#batimumNutFace)"
        stroke="rgba(17,17,17,0.14)"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <polygon points={outer} fill="url(#batimumNutBlue)" stroke="none" />

      {/* Chanfrein extérieur / face intérieure */}
      <polygon
        points={mid}
        fill="rgba(255,255,255,0.10)"
        stroke="rgba(17,17,17,0.08)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <polygon
        points={inner}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(17,17,17,0.055)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* Six pans — contraste discret */}
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
        return (
          <g key={`pan-${i}`}>
            <polygon
              points={`${x0},${y0} ${x1},${y1} ${ix1},${iy1} ${ix0},${iy0}`}
              fill={
                i === 0 || i === 1
                  ? "rgba(255,255,255,0.14)"
                  : i === 3 || i === 4
                    ? "rgba(17,17,17,0.028)"
                    : "rgba(255,255,255,0.04)"
              }
              stroke="none"
            />
            <line
              x1={x0}
              y1={y0}
              x2={ix0}
              y2={iy0}
              stroke="rgba(17,17,17,0.045)"
              strokeWidth="0.85"
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* Reflet pan supérieur gauche */}
      <polygon
        points={`${cx + Math.cos((-20 * Math.PI) / 180) * midR},${cy + Math.sin((-20 * Math.PI) / 180) * midR} ${cx + Math.cos((40 * Math.PI) / 180) * midR},${cy + Math.sin((40 * Math.PI) / 180) * midR} ${cx + Math.cos((40 * Math.PI) / 180) * (ringR + 8)},${cy + Math.sin((40 * Math.PI) / 180) * (ringR + 8)} ${cx + Math.cos((-20 * Math.PI) / 180) * (ringR + 8)},${cy + Math.sin((-20 * Math.PI) / 180) * (ringR + 8)}`}
        fill="url(#batimumNutShine)"
        opacity="0.55"
        stroke="none"
      />

      {/* Bague / alésage + trou */}
      <circle
        cx={cx}
        cy={cy}
        r={chamferR}
        stroke="rgba(17,17,17,0.05)"
        strokeWidth="0.9"
        fill="none"
      />
      <circle
        cx={cx}
        cy={cy}
        r={ringR}
        stroke="rgba(59,130,246,0.12)"
        strokeWidth="1.15"
        fill="rgba(255,255,255,0.06)"
      />
      <circle
        cx={cx}
        cy={cy}
        r={holeR + 6}
        stroke="rgba(17,17,17,0.06)"
        strokeWidth="0.9"
        fill="url(#batimumNutHoleShade)"
      />
      <circle
        cx={cx}
        cy={cy}
        r={holeR}
        stroke="rgba(17,17,17,0.16)"
        strokeWidth="1.35"
        fill="rgba(255,255,255,0.02)"
      />
      <circle
        cx={cx}
        cy={cy}
        r={holeR - 7}
        stroke="rgba(17,17,17,0.05)"
        strokeWidth="0.8"
        fill="none"
      />

      {/* Repères sommets */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (i * 60);
        const vx = cx + Math.cos(a) * outerR;
        const vy = cy + Math.sin(a) * outerR;
        return (
          <g key={`vertex-${i}`}>
            <circle
              cx={vx}
              cy={vy}
              r="2.4"
              fill="rgba(59,130,246,0.16)"
              stroke="rgba(59,130,246,0.16)"
              strokeWidth="0.6"
            />
            <line
              x1={cx + Math.cos(a) * (outerR - 12)}
              y1={cy + Math.sin(a) * (outerR - 12)}
              x2={vx}
              y2={vy}
              stroke="rgba(17,17,17,0.08)"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
}


function FeaturePanel({
  feature,
  onClose,
  onNavigate,
  panelRef,
  positioned,
  pos,
  mobile,
  onPanelEnter,
  onPanelLeave,
}: {
  feature: HexFeature;
  onClose: () => void;
  onNavigate: () => void;
  panelRef?: RefObject<HTMLDivElement | null>;
  positioned?: boolean;
  pos?: {
    x: number;
    y: number;
    arrow: "left" | "right" | "top" | "bottom";
    enterFrom: { x: number; y: number };
  } | null;
  mobile?: boolean;
  onPanelEnter?: () => void;
  onPanelLeave?: () => void;
}) {
  const Icon = feature.Icon;
  const enter = pos?.enterFrom ?? { x: 0, y: 6 };

  return (
    <motion.div
      ref={panelRef}
      className={[
        "batimumHero__featurePopover",
        "batimumHero__featurePanel",
        mobile ? "batimumHero__featurePopover--mobile" : "",
        pos ? `batimumHero__featurePopover--arrow-${pos.arrow}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      id={`batimum-hero-panel-${feature.id}`}
      role="dialog"
      aria-labelledby={`batimum-hero-panel-title-${feature.id}`}
      style={
        positioned && pos
          ? {
              position: "absolute",
              left: pos.x,
              top: pos.y,
            }
          : undefined
      }
      initial={{ opacity: 0, scale: 0.98, x: enter.x, y: enter.y }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.985, x: 0, y: 4 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={onPanelEnter}
      onMouseLeave={onPanelLeave}
      onPointerEnter={onPanelEnter}
      onPointerLeave={onPanelLeave}
      onFocus={onPanelEnter}
    >
      {!mobile ? (
        <span className="batimumHero__featurePopoverArrow" aria-hidden="true" />
      ) : null}
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
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <h3
          id={`batimum-hero-panel-title-${feature.id}`}
          className="batimumHero__featurePanelTitle"
        >
          {feature.panelTitle}
        </h3>
      </div>
      <p className="batimumHero__featurePanelText">{feature.panelText}</p>
      <p className="batimumHero__featurePanelBenefit">
        <Check
          className="batimumHero__featurePanelBenefitIcon"
          size={14}
          strokeWidth={2}
          aria-hidden
        />
        <span>{feature.benefit}</span>
      </p>
      <button
        type="button"
        className="batimumHero__featurePanelCta"
        onClick={onNavigate}
      >
        {feature.ctaLabel}
        <ArrowRight size={14} strokeWidth={1.8} aria-hidden />
      </button>
    </motion.div>
  );
}

function FeatureVertexCard({
  feature,
  radius,
  staticMode,
  isActive,
  isDimmed,
  pinned,
  onActivate,
  onHoverStart,
  onHoverEnd,
  onBlurCard,
  buttonRef,
}: {
  feature: HexFeature;
  radius: number;
  staticMode: boolean;
  isActive: boolean;
  isDimmed: boolean;
  pinned: boolean;
  onActivate: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onBlurCard: (e: FocusEvent<HTMLButtonElement>) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const Icon = feature.Icon;
  const pt = vertexPoint(feature.angle, radius);

  const scale = isActive ? 1 : 0.985;
  const opacity = isActive ? 1 : isDimmed ? 0.68 : 0.76;

  const card = (
    <button
      ref={buttonRef}
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
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onBlurCard}
    >
      <span
        className={`batimumHero__featureCard batimumHero__bubble${isActive ? " is-active" : ""}`}
        data-active={isActive ? "true" : "false"}
        style={{ "--card-accent": feature.accent } as CSSProperties}
      >
        <span className="batimumHero__bubbleIcon" aria-hidden>
          <Icon size={18} strokeWidth={1.75} />
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
        scale,
        opacity,
        zIndex: isActive ? 30 : 10,
      }}
      transformTemplate={({ x: tx, y: ty, scale: s }) =>
        `translate(-50%, -50%) translate(${tx}, ${ty}) scale(${s})`
      }
    >
      {card}
    </motion.div>
  );
}

type LandingHeroOrbitProps = {
  enableOrbit: boolean;
};

/**
 * Système hexagonal interactif :
 * - wrapper rotatif = écrou + 6 bulles
 * - hover / clic → fige + panneau explicatif près de la carte
 * - logo BM fixe au centre
 * - panneau hors flux (aucun reflow du Hero)
 */
export function LandingHeroOrbit({
  enableOrbit,
}: LandingHeroOrbitProps) {
  const reduced = useReducedMotion() ?? false;
  const sceneRef = useRef<HTMLDivElement>(null);
  const interactRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Partial<Record<HeroFeatureId, HTMLButtonElement | null>>>(
    {},
  );
  const sceneSize = useSceneSize(sceneRef);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const systemRotate = useMotionValue(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverWithinRef = useRef(false);
  const pinnedRef = useRef(false);
  const autoPausedRef = useRef(false);
  const autoIndexRef = useRef(0);
  const rotationTargetRef = useRef(0);

  const [activeId, setActiveId] = useState<HeroFeatureId>(FEATURE_IDS[0]);
  const [pinned, setPinned] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [rotationTarget, setRotationTarget] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  useEffect(() => {
    autoPausedRef.current = autoPaused;
  }, [autoPaused]);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const setFeatureByIndex = useCallback((nextIndex: number, source: "auto" | "manual") => {
    const idx = ((nextIndex % FEATURE_IDS.length) + FEATURE_IDS.length) % FEATURE_IDS.length;
    const id = FEATURE_IDS[idx];
    autoIndexRef.current = idx;
    setActiveId(id);

    const desiredBase = idx * 60;
    const current = rotationTargetRef.current;
    if (source === "auto") {
      const nextTarget = current + 60;
      rotationTargetRef.current = nextTarget;
      setRotationTarget(nextTarget);
      return;
    }

    const cycle = 360;
    const wrapped = ((current % cycle) + cycle) % cycle;
    let target = current + (desiredBase - wrapped);
    if (target < current) target += cycle;
    rotationTargetRef.current = target;
    setRotationTarget(target);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (reduced || isMobile || !enableOrbit) {
      setActiveId(FEATURE_IDS[0]);
      setAutoPaused(false);
      autoIndexRef.current = 0;
      rotationTargetRef.current = 0;
      setRotationTarget(0);
      return;
    }
    setFeatureByIndex(autoIndexRef.current, "manual");
  }, [enableOrbit, isMobile, mounted, reduced, setFeatureByIndex]);

  const openFeature = useCallback((id: HeroFeatureId, pin: boolean) => {
    clearCloseTimer();
    setAutoPaused(true);
    const idx = FEATURE_IDS.indexOf(id);
    if (idx >= 0) setFeatureByIndex(idx, "manual");
    if (pin) setPinned(true);
  }, [setFeatureByIndex]);

  const closePanel = useCallback(() => {
    clearCloseTimer();
    hoverWithinRef.current = false;
    setPinned(false);
    setAutoPaused(false);
  }, []);

  const leaveInteractive = useCallback(() => {
    hoverWithinRef.current = false;
    if (pinned) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      if (!hoverWithinRef.current) {
        setAutoPaused(false);
      }
    }, CLOSE_DELAY_MS);
  }, [pinned]);

  const holdOpen = useCallback(() => {
    hoverWithinRef.current = true;
    clearCloseTimer();
    setAutoPaused(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeId) {
        e.preventDefault();
        closePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, closePanel, pinned]);

  useEffect(() => {
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!activeId || !interactRef.current || !pinned) return;
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
  }, [activeId, closePanel, pinned]);

  useEffect(() => {
    if (!enableOrbit || reduced || !mounted || isMobile) return;
    if (pinned || autoPaused) return;

    const cycle = window.setInterval(() => {
      if (pinnedRef.current || autoPausedRef.current || hoverWithinRef.current) {
        return;
      }
      const next = (autoIndexRef.current + 1) % FEATURE_IDS.length;
      setFeatureByIndex(next, "auto");
    }, AUTO_FEATURE_STEP_MS);

    return () => window.clearInterval(cycle);
  }, [autoPaused, enableOrbit, isMobile, mounted, pinned, reduced, setFeatureByIndex]);

  useEffect(() => {
    if (!enableOrbit || reduced || !mounted || isMobile) return;
    const controls = animate(systemRotate, rotationTarget, {
      duration: AUTO_FEATURE_TRANSITION_MS / 1000,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [enableOrbit, isMobile, mounted, reduced, rotationTarget, systemRotate]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
      };
  }, []);

  const staticMode = !mounted || reduced || !enableOrbit || isMobile;
  const radius = vertexRadiusForScene(sceneSize);
  const activeFeature = HERO_FEATURES.find((f) => f.id === activeId) ?? HERO_FEATURES[0];

  const handleNavigate = () => {
    if (!activeFeature) return;
    const href = activeFeature.href;
    closePanel();
    requestAnimationFrame(() => scrollToAnchor(href));
  };

  const onBlurCard = (e: FocusEvent<HTMLButtonElement>) => {
    const next = e.relatedTarget as Node | null;
    if (panelRef.current?.contains(next)) {
      holdOpen();
      return;
    }
    if (interactRef.current?.contains(next)) {
      const isOtherCard = Object.values(cardRefs.current).some(
        (el) => el === next,
      );
      if (isOtherCard) return;
    }
    if (pinned) return;
    leaveInteractive();
  };

  return (
    <div className="batimumHero__orbitRoot" ref={interactRef}>
      <div className="batimumHero__sceneWrap">
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
          </motion.div>

          {HERO_FEATURES.map((feature) => (
            <FeatureVertexCard
              key={feature.id}
              feature={feature}
              radius={radius}
              staticMode={staticMode}
              isActive={activeId === feature.id}
              isDimmed={activeId !== feature.id}
              pinned={pinned}
              buttonRef={(el) => {
                cardRefs.current[feature.id] = el;
              }}
              onActivate={() => openFeature(feature.id, true)}
              onHoverStart={() => {
                if (window.matchMedia("(hover: hover)").matches) {
                  openFeature(feature.id, false);
                  holdOpen();
                }
              }}
              onHoverEnd={() => {
                if (window.matchMedia("(hover: hover)").matches) {
                  leaveInteractive();
                }
              }}
              onBlurCard={onBlurCard}
            />
          ))}

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

        {/* Desktop / tablette : panneau absolu près de la carte — hors flux */}
        {!isMobile ? (
          <div
            className="batimumHero__interactiveZone"
            aria-hidden={!activeFeature}
          >
            <AnimatePresence mode="wait">
              {activeFeature ? (
                <FeaturePanel
                  key={activeFeature.id}
                  feature={activeFeature}
                  panelRef={panelRef}
                  positioned
                  pos={{
                    x: sceneSize + 20,
                    y: Math.max(20, sceneSize * 0.24),
                    arrow: "left",
                    enterFrom: { x: -6, y: 0 },
                  }}
                  onClose={closePanel}
                  onNavigate={handleNavigate}
                  onPanelEnter={holdOpen}
                  onPanelLeave={leaveInteractive}
                />
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      {/* Mobile : panneau sous la scène, hors colonne texte */}
      {isMobile ? (
        <div className="batimumHero__mobilePanelSlot">
          <AnimatePresence mode="wait">
            {activeFeature ? (
              <FeaturePanel
                key={activeFeature.id}
                feature={activeFeature}
                panelRef={panelRef}
                mobile
                onClose={closePanel}
                onNavigate={handleNavigate}
              />
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
}

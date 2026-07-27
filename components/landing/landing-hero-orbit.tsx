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
  useLayoutEffect,
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

type Placement =
  | "right"
  | "top-right"
  | "top-left"
  | "left"
  | "bottom-left"
  | "bottom-right";

const ANGLE_PLACEMENT: Record<number, Placement> = {
  0: "right",
  60: "top-right",
  120: "top-left",
  180: "left",
  240: "bottom-left",
  300: "bottom-right",
};

const PANEL_GAP = 16;
const EDGE_PAD = 16;
const CLOSE_DELAY_MS = 300;
const DESKTOP_PANEL_W = 310;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function computePopoverPosition(args: {
  placement: Placement;
  cardLeft: number;
  cardTop: number;
  cardWidth: number;
  cardHeight: number;
  wrapWidth: number;
  wrapHeight: number;
  panelWidth: number;
  panelHeight: number;
}) {
  const {
    placement: raw,
    cardLeft,
    cardTop,
    cardWidth,
    cardHeight,
    wrapWidth,
    wrapHeight,
    panelWidth,
    panelHeight,
  } = args;

  const cardCx = cardLeft + cardWidth / 2;
  const cardCy = cardTop + cardHeight / 2;

  let placement = raw;
  if (placement === "right" && cardCx > wrapWidth * 0.72) placement = "left";
  if (placement === "left" && cardCx < wrapWidth * 0.28) placement = "right";
  if (
    (placement === "top-right" || placement === "top-left") &&
    cardCy < wrapHeight * 0.28
  ) {
    placement = placement === "top-right" ? "bottom-right" : "bottom-left";
  }
  if (
    (placement === "bottom-right" || placement === "bottom-left") &&
    cardCy > wrapHeight * 0.72
  ) {
    placement = placement === "bottom-right" ? "top-right" : "top-left";
  }

  let x = 0;
  let y = 0;
  let arrow: "left" | "right" | "top" | "bottom" = "left";

  switch (placement) {
    case "right":
      x = cardLeft + cardWidth + PANEL_GAP;
      y = cardCy - panelHeight / 2;
      arrow = "left";
      break;
    case "left":
      x = cardLeft - PANEL_GAP - panelWidth;
      y = cardCy - panelHeight / 2;
      arrow = "right";
      break;
    case "top-right":
      x = cardLeft + cardWidth + PANEL_GAP * 0.35;
      y = cardTop - PANEL_GAP - panelHeight;
      arrow = "bottom";
      break;
    case "top-left":
      x = cardLeft - PANEL_GAP * 0.35 - panelWidth;
      y = cardTop - PANEL_GAP - panelHeight;
      arrow = "bottom";
      break;
    case "bottom-right":
      x = cardLeft + cardWidth + PANEL_GAP * 0.35;
      y = cardTop + cardHeight + PANEL_GAP;
      arrow = "top";
      break;
    case "bottom-left":
      x = cardLeft - PANEL_GAP * 0.35 - panelWidth;
      y = cardTop + cardHeight + PANEL_GAP;
      arrow = "top";
      break;
  }

  if (
    x + panelWidth > wrapWidth - EDGE_PAD &&
    (placement === "right" || placement.includes("right"))
  ) {
    x = cardLeft - PANEL_GAP - panelWidth;
    if (placement === "right") arrow = "right";
  }
  if (
    x < EDGE_PAD &&
    (placement === "left" || placement.includes("left"))
  ) {
    x = cardLeft + cardWidth + PANEL_GAP;
    if (placement === "left") arrow = "left";
  }
  if (y < EDGE_PAD && (placement === "top-right" || placement === "top-left")) {
    y = cardTop + cardHeight + PANEL_GAP;
    arrow = "top";
  }
  if (
    y + panelHeight > wrapHeight - EDGE_PAD &&
    (placement === "bottom-right" || placement === "bottom-left")
  ) {
    y = cardTop - PANEL_GAP - panelHeight;
    arrow = "bottom";
  }

  x = clamp(x, EDGE_PAD, Math.max(EDGE_PAD, wrapWidth - panelWidth - EDGE_PAD));
  y = clamp(
    y,
    EDGE_PAD,
    Math.max(EDGE_PAD, wrapHeight - panelHeight - EDGE_PAD),
  );

  const enterFrom =
    arrow === "left"
      ? { x: -6, y: 0 }
      : arrow === "right"
        ? { x: 6, y: 0 }
        : arrow === "top"
          ? { x: 0, y: -6 }
          : { x: 0, y: 6 };

  return { x, y, arrow, enterFrom };
}

/**
 * Écrou hexagonal flat-top — version sobre (commit 3c5a0f2).
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
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={onPanelEnter}
      onMouseLeave={onPanelLeave}
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
  systemRotate,
  scrollProgress,
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
  systemRotate: MotionValue<number>;
  scrollProgress: MotionValue<number>;
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

  const scale = isActive ? 1.025 : undefined;
  const opacity = isActive ? 1 : isDimmed ? 0.4 : undefined;

  const microHint =
    feature.id === "devis" ? (
      <span className="batimumHero__microHint batimumHero__microHint--devis" aria-hidden>
        <span className="batimumHero__microCheck" />
        Devis prêt
      </span>
    ) : feature.id === "planning" ? (
      <span className="batimumHero__microHint batimumHero__microHint--planning" aria-hidden>
        <span className="batimumHero__microSwap">
          <span>À planifier</span>
          <span>Planifié</span>
        </span>
      </span>
    ) : feature.id === "chantiers" ? (
      <span className="batimumHero__microHint batimumHero__microHint--chantiers" aria-hidden>
        <span className="batimumHero__microBar">
          <span className="batimumHero__microBarFill" />
        </span>
      </span>
    ) : feature.id === "facturation" ? (
      <span className="batimumHero__microHint batimumHero__microHint--facturation" aria-hidden>
        <span className="batimumHero__microSwap">
          <span>À préparer</span>
          <span>Prête</span>
        </span>
      </span>
    ) : feature.id === "clients" ? (
      <span className="batimumHero__microHint batimumHero__microHint--clients" aria-hidden>
        <span className="batimumHero__microDoc" />
      </span>
    ) : (
      <span className="batimumHero__microHint batimumHero__microHint--pilotage" aria-hidden>
        <span className="batimumHero__microSpark" />
      </span>
    );

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
      onFocus={onHoverStart}
      onBlur={onBlurCard}
    >
      <span
        className={`batimumHero__featureCard batimumHero__bubble${isActive ? " is-active" : ""}`}
        style={{ "--card-accent": feature.accent } as CSSProperties}
      >
        <span className="batimumHero__bubbleIcon" aria-hidden>
          <Icon size={17} strokeWidth={1.75} />
        </span>
        <span className="batimumHero__bubbleCopy">
          <span className="batimumHero__bubbleTitle">{feature.title}</span>
          <span className="batimumHero__bubbleSub">{feature.subtitle}</span>
        </span>
        {microHint}
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
 * - hover / clic → fige + panneau explicatif près de la carte
 * - logo BM fixe au centre
 * - panneau hors flux (aucun reflow du Hero)
 */
export function LandingHeroOrbit({
  scrollProgress,
  enableOrbit,
}: LandingHeroOrbitProps) {
  const reduced = useReducedMotion() ?? false;
  const sceneRef = useRef<HTMLDivElement>(null);
  const sceneWrapRef = useRef<HTMLDivElement>(null);
  const interactRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Partial<Record<HeroFeatureId, HTMLButtonElement | null>>>(
    {},
  );
  const sceneSize = useSceneSize(sceneRef);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const systemRotate = useMotionValue(0);
  const speedFactor = useRef(1);
  const targetSpeed = useRef(1);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<HeroFeatureId | null>(null);

  const [activeId, setActiveId] = useState<HeroFeatureId | null>(null);
  const [pinned, setPinned] = useState(false);
  const [panelPos, setPanelPos] = useState<{
    x: number;
    y: number;
    arrow: "left" | "right" | "top" | "bottom";
    enterFrom: { x: number; y: number };
  } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const softStop = useCallback(() => {
    targetSpeed.current = 0;
  }, []);

  const measurePanel = useCallback((id: HeroFeatureId) => {
    const wrap = sceneWrapRef.current;
    const card = cardRefs.current[id];
    const feature = HERO_FEATURES.find((f) => f.id === id);
    if (!wrap || !card || !feature) return;

    const wrapRect = wrap.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const panelEl = panelRef.current;
    const panelWidth = panelEl?.offsetWidth || DESKTOP_PANEL_W;
    const panelHeight = panelEl?.offsetHeight || 220;
    const placement = ANGLE_PLACEMENT[feature.angle] ?? "right";

    const pos = computePopoverPosition({
      placement,
      cardLeft: cardRect.left - wrapRect.left,
      cardTop: cardRect.top - wrapRect.top,
      cardWidth: cardRect.width,
      cardHeight: cardRect.height,
      wrapWidth: wrapRect.width,
      wrapHeight: wrapRect.height,
      panelWidth,
      panelHeight,
    });

    setPanelPos(pos);
  }, []);

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
    setPanelPos(null);
    targetSpeed.current = 1;
  }, []);

  const scheduleClose = useCallback(() => {
    if (pinned) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setActiveId(null);
      setPanelPos(null);
      targetSpeed.current = 1;
    }, CLOSE_DELAY_MS);
  }, [pinned]);

  const holdOpen = useCallback(() => {
    clearCloseTimer();
    softStop();
  }, [softStop]);

  // Mesure du panneau : à l'ouverture, au resize, après ralentissement
  useLayoutEffect(() => {
    if (!activeId || isMobile) {
      if (!activeId) setPanelPos(null);
      return;
    }
    measurePanel(activeId);
    // Affine après montage réel du panneau + fin du ralentissement
    const t1 = window.setTimeout(() => {
      if (activeIdRef.current === activeId) measurePanel(activeId);
    }, 50);
    const t2 = window.setTimeout(() => {
      if (activeIdRef.current === activeId) measurePanel(activeId);
    }, 420);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [activeId, isMobile, measurePanel, sceneSize]);

  useEffect(() => {
    const onResize = () => {
      if (!activeIdRef.current || isMobile) return;
      measurePanel(activeIdRef.current);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isMobile, measurePanel]);

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

      // Ralentissement / reprise douce ~400ms
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

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  const staticMode = !mounted || reduced || !enableOrbit;
  const radius = vertexRadiusForScene(sceneSize);
  const activeFeature = HERO_FEATURES.find((f) => f.id === activeId) ?? null;

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
    scheduleClose();
  };

  return (
    <div className="batimumHero__orbitRoot" ref={interactRef}>
      <div ref={sceneWrapRef} className="batimumHero__sceneWrap">
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
                buttonRef={(el) => {
                  cardRefs.current[feature.id] = el;
                }}
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
                onBlurCard={onBlurCard}
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

        {/* Desktop / tablette : panneau absolu près de la carte — hors flux */}
        {!isMobile ? (
          <div
            className="batimumHero__interactiveZone"
            aria-hidden={!activeFeature}
          >
            <AnimatePresence mode="wait">
              {activeFeature && panelPos ? (
                <FeaturePanel
                  key={activeFeature.id}
                  feature={activeFeature}
                  panelRef={panelRef}
                  positioned
                  pos={panelPos}
                  onClose={closePanel}
                  onNavigate={handleNavigate}
                  onPanelEnter={holdOpen}
                  onPanelLeave={() => scheduleClose()}
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

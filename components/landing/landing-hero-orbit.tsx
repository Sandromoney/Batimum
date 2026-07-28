"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Calendar,
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

type StatFormat = "percent" | "multiplier";

type HeroStat = {
  /** Prefixe avant le chiffre ("Jusqu’à", etc.) — vide si pure valeur */
  prefix: string;
  /** Mot d’ouverture optionnel ("Facturez") */
  lead: string;
  value: number;
  format: StatFormat;
  /** Suite après la valeur ("de temps gagné", "plus vite", …) */
  headline: string;
  subtext: string;
};

type HexFeature = {
  id: HeroFeatureId;
  title: string;
  subtitle: string;
  panelTitle: string;
  panelText: string;
  ctaLabel: string;
  href: string;
  angle: number;
  accent: string;
  Icon: LucideIcon;
  stat: HeroStat;
};

type PanelPos = {
  x: number;
  y: number;
  arrow: "left" | "right" | "top" | "bottom";
};

const ICON_ACCENT = "#3B82F6";

/**
 * Contenu Hero orbit — bénéfices marketing illustratifs (jamais présentés
 * comme résultats mesurés “clients / utilisateurs”).
 */
export const HERO_FEATURES: HexFeature[] = [
  {
    id: "devis",
    title: "Devis avec MUM IA",
    subtitle: "Prêts en quelques minutes",
    panelTitle: "Devis IA ultra rapide",
    panelText:
      "Fini de passer des heures à rédiger vos devis. Décrivez simplement les travaux à réaliser et MUM IA génère un devis personnalisé en quelques secondes. Vous gardez toujours la main pour modifier les quantités, les prix et les prestations avant l’envoi au client.",
    ctaLabel: "Découvrir MUM IA",
    href: "#devis-ia",
    angle: 0,
    accent: ICON_ACCENT,
    Icon: Bot,
    stat: {
      lead: "",
      prefix: "Jusqu’à",
      value: 90,
      format: "percent",
      headline: "de temps gagné",
      subtext: "Créez vos devis en quelques secondes avec MUM IA",
    },
  },
  {
    id: "planning",
    title: "Planning des équipes",
    subtitle: "Tout le monde au bon endroit",
    panelTitle: "Organisez vos équipes en quelques clics",
    panelText:
      "Attribuez vos salariés aux chantiers, visualisez les disponibilités et évitez les oublis. Toute votre équipe sait où aller, quand intervenir et quelles sont les informations importantes.",
    ctaLabel: "Découvrir le planning",
    href: "#planning",
    angle: 60,
    accent: ICON_ACCENT,
    Icon: Calendar,
    stat: {
      lead: "",
      prefix: "Jusqu’à",
      value: 70,
      format: "percent",
      headline: "d’échanges en moins",
      subtext: "Toutes vos équipes et interventions dans un seul planning",
    },
  },
  {
    id: "chantiers",
    title: "Suivi des chantiers",
    subtitle: "Gardez toujours le contrôle",
    panelTitle: "Gardez le contrôle de tous vos chantiers",
    panelText:
      "Suivez chaque étape de vos chantiers en temps réel. Photos, avancement, documents et informations restent centralisés pour ne plus rien oublier.",
    ctaLabel: "Découvrir le suivi chantier",
    href: "#chantiers",
    angle: 120,
    accent: ICON_ACCENT,
    Icon: HardHat,
    stat: {
      lead: "",
      prefix: "",
      value: 100,
      format: "percent",
      headline: "de vos chantiers visibles",
      subtext: "Avancement, documents, photos et informations en temps réel",
    },
  },
  {
    id: "facturation",
    title: "Facturation simplifiée",
    subtitle: "Du devis au paiement",
    panelTitle: "Facturez plus vite",
    panelText:
      "Transformez vos devis en factures en quelques secondes. Suivez facilement les règlements et gardez une vision claire des paiements en attente.",
    ctaLabel: "Découvrir la facturation",
    href: "#facturation",
    angle: 180,
    accent: ICON_ACCENT,
    Icon: Receipt,
    stat: {
      lead: "Facturez",
      prefix: "jusqu’à",
      value: 10,
      format: "multiplier",
      headline: "plus vite",
      subtext: "Transformez un devis en facture sans aucune ressaisie",
    },
  },
  {
    id: "clients",
    title: "Gestion client",
    subtitle: "Tout est facile à retrouver",
    panelTitle: "Toutes vos informations au même endroit",
    panelText:
      "Retrouvez instantanément les coordonnées, devis, factures, documents et historique de chaque client. Fini les recherches interminables.",
    ctaLabel: "Découvrir la gestion client",
    href: "#clients",
    angle: 240,
    accent: ICON_ACCENT,
    Icon: Users,
    stat: {
      lead: "",
      prefix: "",
      value: 100,
      format: "percent",
      headline: "des informations centralisées",
      subtext: "Devis, factures, coordonnées et documents toujours accessibles",
    },
  },
  {
    id: "pilotage",
    title: "Pilotage et rentabilité",
    subtitle: "Vos marges sous contrôle",
    panelTitle: "Analysez réellement vos marges",
    panelText:
      "Visualisez la rentabilité de chaque chantier, comparez le prévu au réalisé et identifiez rapidement les projets les plus rentables. Prenez de meilleures décisions grâce à des données claires.",
    ctaLabel: "Découvrir le pilotage",
    href: "#pilotage",
    angle: 300,
    accent: ICON_ACCENT,
    Icon: LineChart,
    stat: {
      lead: "",
      prefix: "",
      value: 100,
      format: "percent",
      headline: "de visibilité sur vos marges",
      subtext: "Analysez la rentabilité réelle de chaque chantier",
    },
  },
];

const FEATURE_IDS: HeroFeatureId[] = HERO_FEATURES.map((f) => f.id);

const BASE_SCENE = 840;
const NUT_SIZE_RATIO = 0.8;
const NUT_VERTEX_SVG = 188 / 200;

/** Rotation continue GPU — ~30 % plus lente que 28,5 s */
export const ORBIT_SPIN_SECONDS = 37;

/**
 * Timer principal unique (feature active + stat) — une seule source de vérité.
 * fade-in 250 ms → hold 4 s → fade-out 200 ms → suivante immédiatement (0 ms de vide).
 * AUTO_CYCLE = durée exacte de l’animation CSS : pas de respiration / temps mort.
 */
export const STAT_FADE_IN_MS = 250;
export const STAT_HOLD_MS = 4000;
export const STAT_FADE_OUT_MS = 200;
export const STAT_VISIBLE_MS =
  STAT_FADE_IN_MS + STAT_HOLD_MS + STAT_FADE_OUT_MS; // 4450
export const AUTO_CYCLE_MS = STAT_VISIBLE_MS;
export const COUNTER_MS = 800;
const BUBBLE_EXIT_S = 0.3;
const HOVER_GRACE_MS = 120;
const CLOSE_DELAY_MS = 700;
const PANEL_WIDTH = 312;
const PANEL_EST_HEIGHT = 280;

export const HERO_BM_SYMBOL_SRC = "/logo-batimum.png";
const BM_SYMBOL_SRC_W = 829;
const BM_SYMBOL_SRC_H = 210;

function vertexRadiusForScene(sceneSize: number) {
  const raw = sceneSize * NUT_SIZE_RATIO * 0.5 * NUT_VERTEX_SVG - 12;
  return Math.min(274, Math.max(168, raw));
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

function computePanelPos(card: HTMLElement, wrap: HTMLElement): PanelPos {
  const cr = card.getBoundingClientRect();
  const wr = wrap.getBoundingClientRect();
  const cardCx = cr.left + cr.width / 2 - wr.left;
  const cardCy = cr.top + cr.height / 2 - wr.top;
  const gap = 14;
  const placeRight = cardCx < wr.width * 0.52;
  let x = placeRight
    ? cr.right - wr.left + gap
    : cr.left - wr.left - PANEL_WIDTH - gap;
  let y = cardCy - PANEL_EST_HEIGHT * 0.36;
  x = Math.min(Math.max(8, x), Math.max(8, wr.width - PANEL_WIDTH - 8));
  y = Math.min(Math.max(8, y), Math.max(8, wr.height - PANEL_EST_HEIGHT - 8));
  return { x, y, arrow: placeRight ? "left" : "right" };
}

function computeBridgeStyle(
  card: HTMLElement,
  wrap: HTMLElement,
  panel: PanelPos,
): CSSProperties {
  const cr = card.getBoundingClientRect();
  const wr = wrap.getBoundingClientRect();
  const cardCx = cr.left + cr.width / 2 - wr.left;
  const cardCy = cr.top + cr.height / 2 - wr.top;
  const panelCx = panel.x + PANEL_WIDTH / 2;
  const panelCy = panel.y + 80;
  const left = Math.min(cardCx, panelCx) - 28;
  const top = Math.min(cardCy, panelCy) - 28;
  const width = Math.abs(panelCx - cardCx) + 56;
  const height = Math.abs(panelCy - cardCy) + 56;
  return {
    position: "absolute",
    left,
    top,
    width: Math.max(width, 48),
    height: Math.max(height, 48),
    zIndex: 55,
    pointerEvents: "auto",
  };
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Compteur 0 → valeur (700–900 ms), respect reduced-motion */
function useCountUp(
  target: number,
  durationMs: number,
  play: boolean,
  reduced: boolean,
  epoch: number,
) {
  const [value, setValue] = useState(reduced || !play ? target : 0);

  useEffect(() => {
    if (reduced || !play) {
      setValue(target);
      return;
    }
    setValue(0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * easeOutCubic(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, play, reduced, epoch]);

  return value;
}

function formatUnit(format: StatFormat) {
  return format === "multiplier" ? "×" : "%";
}

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
        <linearGradient
          id="batimumNutFace"
          x1="70"
          y1="60"
          x2="320"
          y2="340"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
        <linearGradient
          id="batimumNutShine"
          x1="90"
          y1="70"
          x2="210"
          y2="190"
          gradientUnits="userSpaceOnUse"
        >
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

      <polygon
        points={back}
        fill="rgba(248,250,252,0.22)"
        stroke="rgba(17,17,17,0.055)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <polygon
        points={outer}
        fill="url(#batimumNutFace)"
        stroke="rgba(17,17,17,0.14)"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <polygon points={outer} fill="url(#batimumNutBlue)" stroke="none" />
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

      <polygon
        points={`${cx + Math.cos((-20 * Math.PI) / 180) * midR},${cy + Math.sin((-20 * Math.PI) / 180) * midR} ${cx + Math.cos((40 * Math.PI) / 180) * midR},${cy + Math.sin((40 * Math.PI) / 180) * midR} ${cx + Math.cos((40 * Math.PI) / 180) * (ringR + 8)},${cy + Math.sin((40 * Math.PI) / 180) * (ringR + 8)} ${cx + Math.cos((-20 * Math.PI) / 180) * (ringR + 8)},${cy + Math.sin((-20 * Math.PI) / 180) * (ringR + 8)}`}
        fill="url(#batimumNutShine)"
        opacity="0.55"
        stroke="none"
      />

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

function FeatureStatBadge({
  stat,
  mode,
  reduced,
  epoch,
}: {
  stat: HeroStat;
  /** auto = cycle fade ; held = figé au survol */
  mode: "auto" | "held";
  reduced: boolean;
  epoch: number;
}) {
  const count = useCountUp(stat.value, COUNTER_MS, true, reduced, epoch);
  const unit = formatUnit(stat.format);

  return (
    <span
      className={`batimumHero__statBadge batimumHero__statBadge--${mode}`}
      style={
        {
          "--batimum-stat-cycle": `${STAT_VISIBLE_MS}ms`,
          "--batimum-stat-enter": `${STAT_FADE_IN_MS}ms`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span className="batimumHero__statBadgeMain">
        {stat.lead ? (
          <span className="batimumHero__statBadgeLead">{stat.lead}</span>
        ) : null}
        {stat.prefix ? (
          <span className="batimumHero__statBadgePrefix">{stat.prefix}</span>
        ) : null}
        <span className="batimumHero__statBadgeValue">
          <span className="batimumHero__statBadgeNumber">{count}</span>
          <span className="batimumHero__statBadgeUnit">{unit}</span>
        </span>
        <span className="batimumHero__statBadgeHeadline">{stat.headline}</span>
      </span>
      <span className="batimumHero__statBadgeSub">{stat.subtext}</span>
    </span>
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
  pos?: PanelPos | null;
  mobile?: boolean;
  onPanelEnter?: () => void;
  onPanelLeave?: () => void;
}) {
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
              width: PANEL_WIDTH,
            }
          : undefined
      }
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: BUBBLE_EXIT_S, ease: [0.22, 1, 0.36, 1] }}
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
      <h3
        id={`batimum-hero-panel-title-${feature.id}`}
        className="batimumHero__featurePanelTitle"
      >
        {feature.panelTitle}
      </h3>
      <p className="batimumHero__featurePanelText">{feature.panelText}</p>
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
  isActive,
  showBubble,
  showStat,
  statMode,
  reduced,
  statEpoch,
  onActivate,
  onCardEnter,
  onCardLeave,
  onBlurCard,
  buttonRef,
}: {
  feature: HexFeature;
  radius: number;
  isActive: boolean;
  showBubble: boolean;
  showStat: boolean;
  statMode: "auto" | "held";
  reduced: boolean;
  statEpoch: number;
  onActivate: () => void;
  onCardEnter: () => void;
  onCardLeave: () => void;
  onBlurCard: (e: FocusEvent<HTMLButtonElement>) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const Icon = feature.Icon;
  const pt = vertexPoint(feature.angle, radius);

  return (
    <div
      className={[
        "batimumHero__featureAnchor",
        "batimumHero__nutVertex",
        isActive ? "is-active" : "is-dimmed",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        transform: `translate(-50%, -50%) translate(${pt.x}px, ${pt.y}px)`,
        zIndex: showBubble ? 40 : isActive ? 24 : 10,
      }}
      onMouseEnter={onCardEnter}
      onMouseLeave={onCardLeave}
      onPointerEnter={onCardEnter}
      onPointerLeave={onCardLeave}
    >
      <div className="batimumHero__featureCounter">
        <button
          ref={buttonRef}
          type="button"
          className={`batimumHero__featureButton${isActive ? " is-active" : ""}`}
          aria-expanded={showBubble}
          aria-controls={`batimum-hero-panel-${feature.id}`}
          aria-label={`${feature.panelTitle} — en savoir plus`}
          onClick={(e) => {
            e.stopPropagation();
            onActivate();
          }}
          onFocus={onCardEnter}
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

        {showStat ? (
          <FeatureStatBadge
            key={`${feature.id}-${statEpoch}`}
            stat={feature.stat}
            mode={statMode}
            reduced={reduced}
            epoch={statEpoch}
          />
        ) : null}
      </div>
    </div>
  );
}

type LandingHeroOrbitProps = {
  enableOrbit: boolean;
};

/**
 * Orbit Hero premium — source unique :
 * - spin CSS continu (play-state pour pause, jamais transform:none)
 * - contre-rotation des cartes
 * - logo BM fixe
 * - 1 timer pour feature active + statistique / compteur
 * - zone hover commune carte ↔ pont ↔ bulle
 */
export function LandingHeroOrbit({ enableOrbit }: LandingHeroOrbitProps) {
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
  const [isNarrow, setIsNarrow] = useState(false);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinnedRef = useRef(false);
  const pausedRef = useRef(false);
  const autoIndexRef = useRef(0);
  const isCardHoveredRef = useRef(false);
  const isTooltipHoveredRef = useRef(false);
  const isBridgeHoveredRef = useRef(false);

  const [activeId, setActiveId] = useState<HeroFeatureId>(FEATURE_IDS[0]);
  const [pinned, setPinned] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const [bridgeStyle, setBridgeStyle] = useState<CSSProperties | null>(null);
  const [statEpoch, setStatEpoch] = useState(0);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [isInteractionZoneHovered, setIsInteractionZoneHovered] =
    useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    isCardHoveredRef.current = isCardHovered;
  }, [isCardHovered]);

  useEffect(() => {
    isTooltipHoveredRef.current = isTooltipHovered;
  }, [isTooltipHovered]);

  useEffect(() => {
    isBridgeHoveredRef.current = isInteractionZoneHovered;
  }, [isInteractionZoneHovered]);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const clearGraceTimer = () => {
    if (graceTimer.current) {
      clearTimeout(graceTimer.current);
      graceTimer.current = null;
    }
  };

  const orbiting = mounted && enableOrbit && !reduced;
  const staticMode = !orbiting;

  const shouldKeepTooltipOpen =
    isCardHovered || isTooltipHovered || isInteractionZoneHovered || pinned;

  const updatePanelPos = useCallback((id: HeroFeatureId) => {
    const card = cardRefs.current[id];
    const wrap = sceneWrapRef.current;
    if (!card || !wrap) return;
    const pos = computePanelPos(card, wrap);
    setPanelPos(pos);
    setBridgeStyle(computeBridgeStyle(card, wrap, pos));
  }, []);

  const bumpStat = useCallback(() => {
    setStatEpoch((n) => n + 1);
  }, []);

  const openFeature = useCallback(
    (id: HeroFeatureId, pin: boolean, withBubble: boolean) => {
      clearCloseTimer();
      clearGraceTimer();
      const idx = FEATURE_IDS.indexOf(id);
      const changed = idx >= 0 && FEATURE_IDS[idx] !== activeId;
      if (idx >= 0) {
        autoIndexRef.current = idx;
        setActiveId(id);
      }
      setPaused(true);
      setShowBubble(withBubble);
      if (pin) setPinned(true);
      if (changed || withBubble) bumpStat();
      if (withBubble && !isNarrow) {
        requestAnimationFrame(() => updatePanelPos(id));
      }
    },
    [activeId, bumpStat, isNarrow, updatePanelPos],
  );

  const resumeAuto = useCallback(() => {
    setIsCardHovered(false);
    setIsTooltipHovered(false);
    setIsInteractionZoneHovered(false);
    setShowBubble(false);
    setPanelPos(null);
    setBridgeStyle(null);
    setPaused(false);
    bumpStat();
  }, [bumpStat]);

  const closePanel = useCallback(() => {
    clearCloseTimer();
    clearGraceTimer();
    setPinned(false);
    setIsCardHovered(false);
    setIsTooltipHovered(false);
    setIsInteractionZoneHovered(false);
    setShowBubble(false);
    setPanelPos(null);
    setBridgeStyle(null);
    setPaused(false);
    bumpStat();
  }, [bumpStat]);

  /** Ne ferme la bulle que si toute la zone commune est quittée */
  const scheduleLeaveCheck = useCallback(() => {
    if (pinnedRef.current) return;
    clearGraceTimer();
    graceTimer.current = setTimeout(() => {
      const keep =
        isCardHoveredRef.current ||
        isTooltipHoveredRef.current ||
        isBridgeHoveredRef.current ||
        pinnedRef.current;
      if (keep) return;

      setShowBubble(false);
      setPanelPos(null);
      setBridgeStyle(null);
      clearCloseTimer();
      closeTimer.current = setTimeout(() => {
        const stillKeep =
          isCardHoveredRef.current ||
          isTooltipHoveredRef.current ||
          isBridgeHoveredRef.current ||
          pinnedRef.current;
        if (!stillKeep) resumeAuto();
      }, CLOSE_DELAY_MS);
    }, HOVER_GRACE_MS);
  }, [resumeAuto]);

  const holdOpen = useCallback(() => {
    clearCloseTimer();
    clearGraceTimer();
    setPaused(true);
  }, []);

  useEffect(() => {
    if (shouldKeepTooltipOpen) {
      clearCloseTimer();
      clearGraceTimer();
      setPaused(true);
      if (!isNarrow && (isCardHovered || isTooltipHovered || isInteractionZoneHovered)) {
        setShowBubble(true);
      }
    }
  }, [
    shouldKeepTooltipOpen,
    isCardHovered,
    isTooltipHovered,
    isInteractionZoneHovered,
    isNarrow,
  ]);

  useEffect(() => {
    if (!paused && !pinned) {
      setShowBubble(false);
      setPanelPos(null);
      setBridgeStyle(null);
    }
  }, [paused, pinned]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (showBubble || pinned)) {
        e.preventDefault();
        closePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePanel, pinned, showBubble]);

  useEffect(() => {
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!showBubble || !interactRef.current) return;
      if (!pinned && !isNarrow) return;
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
  }, [closePanel, isNarrow, pinned, showBubble]);

  /** Unique timer — feature active + stats */
  useEffect(() => {
    if (!orbiting || paused) return;

    const id = window.setInterval(() => {
      if (
        pinnedRef.current ||
        pausedRef.current ||
        isCardHoveredRef.current ||
        isTooltipHoveredRef.current ||
        isBridgeHoveredRef.current
      ) {
        return;
      }
      const next = (autoIndexRef.current + 1) % FEATURE_IDS.length;
      autoIndexRef.current = next;
      setActiveId(FEATURE_IDS[next]);
      setStatEpoch((n) => n + 1);
    }, AUTO_CYCLE_MS);

    return () => window.clearInterval(id);
  }, [orbiting, paused]);

  useLayoutEffect(() => {
    if (!showBubble || isNarrow) return;
    updatePanelPos(activeId);
  }, [activeId, isNarrow, showBubble, updatePanelPos, sceneSize]);

  useEffect(() => {
    if (!showBubble || isNarrow) return;
    const onResize = () => updatePanelPos(activeId);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeId, isNarrow, showBubble, updatePanelPos]);

  useEffect(
    () => () => {
      clearCloseTimer();
      clearGraceTimer();
    },
    [],
  );

  const radius = vertexRadiusForScene(sceneSize);
  const activeFeature =
    HERO_FEATURES.find((f) => f.id === activeId) ?? HERO_FEATURES[0];
  const statMode: "auto" | "held" = paused ? "held" : "auto";

  const handleNavigate = () => {
    const href = activeFeature.href;
    closePanel();
    requestAnimationFrame(() => scrollToAnchor(href));
  };

  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover)").matches;

  const onCardEnter = (id: HeroFeatureId) => {
    if (!canHover()) return;
    setIsCardHovered(true);
    openFeature(id, false, true);
    holdOpen();
  };

  const onCardLeave = () => {
    if (!canHover()) return;
    setIsCardHovered(false);
    scheduleLeaveCheck();
  };

  const onTooltipEnter = () => {
    setIsTooltipHovered(true);
    holdOpen();
  };

  const onTooltipLeave = () => {
    setIsTooltipHovered(false);
    scheduleLeaveCheck();
  };

  const onBridgeEnter = () => {
    setIsInteractionZoneHovered(true);
    holdOpen();
  };

  const onBridgeLeave = () => {
    setIsInteractionZoneHovered(false);
    scheduleLeaveCheck();
  };

  const onBlurCard = (e: FocusEvent<HTMLButtonElement>) => {
    const next = e.relatedTarget as Node | null;
    if (panelRef.current?.contains(next)) {
      setIsTooltipHovered(true);
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
    setIsCardHovered(false);
    scheduleLeaveCheck();
  };

  return (
    <div className="batimumHero__orbitRoot" ref={interactRef}>
      <div className="batimumHero__sceneWrap" ref={sceneWrapRef}>
        <div ref={sceneRef} className="batimumHero__scene">
          <div className="batimumHero__center" aria-hidden />
          <div className="batimumHero__glow" aria-hidden />

          <div className="batimumHero__nutSystem">
            <div
              className={[
                "batimumHero__nutSystemSpin",
                staticMode ? "is-static" : "",
                paused && !staticMode ? "is-paused" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="batimumHero__nut" aria-hidden="true">
                <HeroNutSvg />
              </div>

              {HERO_FEATURES.map((feature) => {
                const isActive = activeId === feature.id;
                return (
                  <FeatureVertexCard
                    key={feature.id}
                    feature={feature}
                    radius={radius}
                    isActive={isActive}
                    showBubble={showBubble && isActive}
                    showStat={isActive && (orbiting || reduced)}
                    statMode={statMode}
                    reduced={reduced}
                    statEpoch={statEpoch}
                    buttonRef={(el) => {
                      cardRefs.current[feature.id] = el;
                    }}
                    onActivate={() => openFeature(feature.id, true, true)}
                    onCardEnter={() => onCardEnter(feature.id)}
                    onCardLeave={onCardLeave}
                    onBlurCard={onBlurCard}
                  />
                );
              })}
            </div>
          </div>

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
              />
            </div>
          </div>
        </div>

        {!isNarrow ? (
          <div
            className="batimumHero__interactiveZone"
            aria-hidden={!showBubble}
          >
            {showBubble && bridgeStyle ? (
              <div
                className="batimumHero__hoverBridge"
                style={bridgeStyle}
                aria-hidden="true"
                onMouseEnter={onBridgeEnter}
                onMouseLeave={onBridgeLeave}
                onPointerEnter={onBridgeEnter}
                onPointerLeave={onBridgeLeave}
              />
            ) : null}
            <AnimatePresence mode="wait">
              {showBubble && activeFeature && panelPos ? (
                <FeaturePanel
                  key={activeFeature.id}
                  feature={activeFeature}
                  panelRef={panelRef}
                  positioned
                  pos={panelPos}
                  onClose={closePanel}
                  onNavigate={handleNavigate}
                  onPanelEnter={onTooltipEnter}
                  onPanelLeave={onTooltipLeave}
                />
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </div>

      {isNarrow ? (
        <div className="batimumHero__mobilePanelSlot">
          <AnimatePresence mode="wait">
            {showBubble && activeFeature ? (
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

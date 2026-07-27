"use client";

import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Calculator,
  CalendarDays,
  HardHat,
  Receipt,
  Users,
  TrendingUp,
} from "lucide-react";

type OrbitCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
  /** Extra drift on scroll (px) — suggests feeding the next sections */
  scrollDriftY: number;
  scrollDriftX: number;
};

const ORBIT_CARDS: OrbitCard[] = [
  {
    id: "devis",
    title: "Devis IA",
    subtitle: "Crée vos devis automatiquement",
    icon: <Calculator className="h-4 w-4" strokeWidth={2.25} />,
    accent: "#10b981",
    scrollDriftY: 120,
    scrollDriftX: -40,
  },
  {
    id: "planning",
    title: "Planning",
    subtitle: "Vos équipes toujours organisées",
    icon: <CalendarDays className="h-4 w-4" strokeWidth={2.25} />,
    accent: "#0ea5e9",
    scrollDriftY: 90,
    scrollDriftX: 20,
  },
  {
    id: "chantiers",
    title: "Chantiers",
    subtitle: "Suivi en temps réel",
    icon: <HardHat className="h-4 w-4" strokeWidth={2.25} />,
    accent: "#14b8a6",
    scrollDriftY: 70,
    scrollDriftX: 50,
  },
  {
    id: "facturation",
    title: "Facturation",
    subtitle: "Paiements et relances simplifiés",
    icon: <Receipt className="h-4 w-4" strokeWidth={2.25} />,
    accent: "#22c55e",
    scrollDriftY: 100,
    scrollDriftX: -10,
  },
  {
    id: "clients",
    title: "Clients",
    subtitle: "Toutes vos informations réunies",
    icon: <Users className="h-4 w-4" strokeWidth={2.25} />,
    accent: "#38bdf8",
    scrollDriftY: 80,
    scrollDriftX: -55,
  },
  {
    id: "rentabilite",
    title: "Rentabilité",
    subtitle: "Pilotez vos marges instantanément",
    icon: <TrendingUp className="h-4 w-4" strokeWidth={2.25} />,
    accent: "#059669",
    scrollDriftY: 110,
    scrollDriftX: 35,
  },
];

const ORBIT_RADIUS_DESKTOP = 230;
const ORBIT_RADIUS_MOBILE = 168;
const FULL_TURN_MS = 90_000;

type LandingHeroOrbitProps = {
  sectionRef: RefObject<HTMLElement | null>;
};

export function LandingHeroOrbit({ sectionRef }: LandingHeroOrbitProps) {
  const reducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const angleDeg = useMotionValue(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [orbitRadius, setOrbitRadius] = useState(ORBIT_RADIUS_DESKTOP);
  /** Avoid SSR/client Framer style mismatches that crash Fast Refresh. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () =>
      setOrbitRadius(mq.matches ? ORBIT_RADIUS_MOBILE : ORBIT_RADIUS_DESKTOP);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const scrollProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 28,
    mass: 0.5,
  });

  const orbitOpacity = useTransform(scrollProgress, [0, 0.55, 0.85], [1, 0.92, 0.55]);
  const stageScale = useTransform(scrollProgress, [0, 0.8], [1, 0.94]);

  const staticMode = !mounted || Boolean(reducedMotion);

  useEffect(() => {
    if (staticMode) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const slowdown = 1 - Math.min(0.55, scrollYProgress.get() * 0.7);
      const degPerSec = (360 / (FULL_TURN_MS / 1000)) * slowdown;
      angleDeg.set((angleDeg.get() + degPerSec * dt) % 360);
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [angleDeg, scrollYProgress, staticMode]);

  return (
    <motion.div
      ref={stageRef}
      className="lp-orbit"
      style={staticMode ? undefined : { opacity: orbitOpacity, scale: stageScale }}
      aria-hidden="true"
    >
      <div className="lp-orbit__halos" />

      <div className="lp-orbit__ring lp-orbit__ring--inner" />
      <div className="lp-orbit__ring lp-orbit__ring--outer" />

      <OrbitDots
        angleDeg={angleDeg}
        reducedMotion={staticMode}
        orbitRadius={orbitRadius}
      />

      {ORBIT_CARDS.map((card, index) => (
        <OrbitFeatureCard
          key={`${card.id}-${orbitRadius}`}
          card={card}
          index={index}
          total={ORBIT_CARDS.length}
          angleDeg={angleDeg}
          scrollProgress={scrollProgress}
          reducedMotion={staticMode}
          orbitRadius={orbitRadius}
          hovered={hoveredId === card.id}
          onHoverChange={(active) => setHoveredId(active ? card.id : null)}
        />
      ))}

      {hoveredId ? (
        <OrbitBeam
          cardId={hoveredId}
          angleDeg={angleDeg}
          orbitRadius={orbitRadius}
        />
      ) : null}

      <motion.div
        className="lp-orbit__core"
        animate={
          staticMode
            ? undefined
            : { y: [0, -3, 0] }
        }
        transition={
          staticMode
            ? undefined
            : { duration: 6, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <div className="lp-orbit__logo-card">
          <Image
            src="/logo-batimum.png"
            alt="Batimum"
            width={140}
            height={40}
            className="lp-orbit__logo"
            priority
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function OrbitDots({
  angleDeg,
  reducedMotion,
  orbitRadius,
}: {
  angleDeg: MotionValue<number>;
  reducedMotion: boolean;
  orbitRadius: number;
}) {
  const dots = [
    { ring: orbitRadius * 0.82, phase: 0, size: 0.35 },
    { ring: orbitRadius * 0.82, phase: 120, size: 0.5 },
    { ring: orbitRadius * 0.82, phase: 240, size: 0.4 },
    { ring: orbitRadius * 1.2, phase: 40, size: 0.3 },
    { ring: orbitRadius * 1.2, phase: 160, size: 0.45 },
    { ring: orbitRadius * 1.2, phase: 280, size: 0.35 },
  ];

  return (
    <>
      {dots.map((dot, i) => (
        <OrbitDot
          key={i}
          ring={dot.ring}
          phase={dot.phase}
          size={dot.size}
          angleDeg={angleDeg}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  );
}

function OrbitDot({
  ring,
  phase,
  size,
  angleDeg,
  reducedMotion,
}: {
  ring: number;
  phase: number;
  size: number;
  angleDeg: MotionValue<number>;
  reducedMotion: boolean;
}) {
  const x = useTransform(angleDeg, (deg) => {
    const rad = ((deg * 0.35 + phase) * Math.PI) / 180;
    return Math.cos(rad) * ring;
  });
  const y = useTransform(angleDeg, (deg) => {
    const rad = ((deg * 0.35 + phase) * Math.PI) / 180;
    return Math.sin(rad) * ring;
  });

  const dim = `${size * 8}px`;

  if (reducedMotion) {
    const rad = (phase * Math.PI) / 180;
    const tx = Math.round(Math.cos(rad) * ring * 1000) / 1000;
    const ty = Math.round(Math.sin(rad) * ring * 1000) / 1000;
    return (
      <span
        className="lp-orbit__dot"
        style={{
          width: dim,
          height: dim,
          transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px)`,
        }}
      />
    );
  }

  return (
    <motion.span
      className="lp-orbit__dot"
      style={{
        width: dim,
        height: dim,
        x,
        y,
      }}
    />
  );
}

function OrbitFeatureCard({
  card,
  index,
  total,
  angleDeg,
  scrollProgress,
  reducedMotion,
  orbitRadius,
  hovered,
  onHoverChange,
}: {
  card: OrbitCard;
  index: number;
  total: number;
  angleDeg: MotionValue<number>;
  scrollProgress: MotionValue<number>;
  reducedMotion: boolean;
  orbitRadius: number;
  hovered: boolean;
  onHoverChange: (active: boolean) => void;
}) {
  const baseAngle = (index / total) * 360 - 90;

  const x = useTransform(angleDeg, (deg) => {
    const rad = ((deg + baseAngle) * Math.PI) / 180;
    return Math.cos(rad) * orbitRadius;
  });
  const y = useTransform(angleDeg, (deg) => {
    const rad = ((deg + baseAngle) * Math.PI) / 180;
    return Math.sin(rad) * orbitRadius;
  });

  const scrollX = useTransform(scrollProgress, [0.15, 0.75], [0, card.scrollDriftX]);
  const scrollY = useTransform(scrollProgress, [0.15, 0.75], [0, card.scrollDriftY]);
  const scrollOpacity = useTransform(scrollProgress, [0.35, 0.85], [1, 0.35]);

  const combinedX = useTransform([x, scrollX], ([a, b]) => Number(a) + Number(b));
  const combinedY = useTransform([y, scrollY], ([a, b]) => Number(a) + Number(b));

  const staticRad = (baseAngle * Math.PI) / 180;
  const staticStyle = reducedMotion
    ? {
        transform: `translate(${Math.cos(staticRad) * orbitRadius}px, ${Math.sin(staticRad) * orbitRadius}px)`,
      }
    : undefined;

  return (
    <motion.div
      className={`lp-orbit-card${hovered ? " is-hovered" : ""}`}
      style={
        reducedMotion
          ? staticStyle
          : {
              x: combinedX,
              y: combinedY,
              opacity: scrollOpacity,
            }
      }
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      whileHover={reducedMotion ? undefined : { scale: 1.05 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      <div
        className="lp-orbit-card__icon"
        style={{ color: card.accent, background: `${card.accent}14` }}
      >
        {card.icon}
      </div>
      <div className="lp-orbit-card__copy">
        <div className="lp-orbit-card__title">{card.title}</div>
        <div className="lp-orbit-card__subtitle">{card.subtitle}</div>
      </div>
    </motion.div>
  );
}

function OrbitBeam({
  cardId,
  angleDeg,
  orbitRadius,
}: {
  cardId: string;
  angleDeg: MotionValue<number>;
  orbitRadius: number;
}) {
  const index = ORBIT_CARDS.findIndex((c) => c.id === cardId);
  const baseAngle =
    index >= 0 ? (index / ORBIT_CARDS.length) * 360 - 90 : -90;
  const rotate = useTransform(angleDeg, (deg) => deg + baseAngle);

  if (index < 0) return null;

  return (
    <motion.div
      className="lp-orbit__beam-line"
      style={{ rotate, width: orbitRadius }}
      aria-hidden="true"
    />
  );
}

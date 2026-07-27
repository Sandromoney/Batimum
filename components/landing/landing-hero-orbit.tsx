"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
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
} from "react";

type OrbitFeature = {
  id: string;
  title: string;
  subtitle: string;
  orbit: 0 | 1 | 2;
  accent: string;
  Icon: typeof Sparkles;
};

const FEATURES: OrbitFeature[] = [
  {
    id: "devis",
    title: "Devis avec IA",
    subtitle: "Créés en quelques minutes",
    orbit: 2,
    accent: "#10B981",
    Icon: Sparkles,
  },
  {
    id: "planning",
    title: "Planning des équipes",
    subtitle: "Toujours à jour",
    orbit: 2,
    accent: "#A78BFA",
    Icon: CalendarDays,
  },
  {
    id: "chantiers",
    title: "Suivi des chantiers",
    subtitle: "En temps réel",
    orbit: 1,
    accent: "#60A5FA",
    Icon: Building2,
  },
  {
    id: "facturation",
    title: "Facturation",
    subtitle: "Simple et rapide",
    orbit: 1,
    accent: "#FB923C",
    Icon: Receipt,
  },
  {
    id: "clients",
    title: "Clients centralisés",
    subtitle: "Tout au même endroit",
    orbit: 0,
    accent: "#FBBF24",
    Icon: Users,
  },
  {
    id: "pilotage",
    title: "Pilotage et rentabilité",
    subtitle: "Décisions plus claires",
    orbit: 0,
    accent: "#059669",
    Icon: LayoutDashboard,
  },
];

/** Ellipse radii as % of scene — cards stay inside with padding. */
const ORBIT_DESKTOP = [
  { rx: 18, ry: 14, duration: 26, reverse: false },
  { rx: 27, ry: 21, duration: 31, reverse: true },
  { rx: 35, ry: 27, duration: 37, reverse: false },
] as const;

const ORBIT_MOBILE = [
  { rx: 22, ry: 17, duration: 28, reverse: false },
  { rx: 32, ry: 25, duration: 34, reverse: true },
] as const;

const MOBILE_FEATURE_IDS = new Set([
  "devis",
  "planning",
  "chantiers",
  "pilotage",
]);

function useIsNarrow(breakpoint = 768) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return narrow;
}

function OrbitingCard({
  feature,
  rx,
  ry,
  duration,
  reverse,
  phase,
  speedMul,
  index,
  reduced,
}: {
  feature: OrbitFeature;
  rx: number;
  ry: number;
  duration: number;
  reverse: boolean;
  phase: number;
  speedMul: MotionValue<number>;
  index: number;
  reduced: boolean;
}) {
  const angle = useMotionValue(phase);
  const paused = useRef(false);

  useEffect(() => {
    if (reduced) {
      angle.set(phase);
      return;
    }

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused.current) {
        const mul = speedMul.get();
        angle.set(
          angle.get() +
            ((Math.PI * 2) / duration) * dt * mul * (reverse ? -1 : 1),
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [angle, duration, phase, reduced, reverse, speedMul]);

  const left = useTransform(
    angle,
    (a) => `calc(50% + ${Math.cos(a) * rx}%)`,
  );
  const top = useTransform(
    angle,
    (a) => `calc(50% + ${Math.sin(a) * ry + Math.sin(a * 2) * 0.45}%)`,
  );
  const Icon = feature.Icon;

  return (
    <motion.div
      className="lp-orbit__card-wrap"
      style={{ left, top, x: "-50%", y: "-50%" }}
      initial={reduced ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={reduced ? undefined : { scale: 1.03 }}
      transition={{
        opacity: { duration: 0.45, delay: 0.55 + index * 0.08 },
        scale: { type: "spring", stiffness: 380, damping: 28 },
      }}
      onPointerEnter={() => {
        paused.current = true;
      }}
      onPointerLeave={() => {
        paused.current = false;
      }}
    >
      <article
        className="lp-orbit__card"
        style={{ "--orbit-accent": feature.accent } as CSSProperties}
      >
        <span className="lp-orbit__card-icon" aria-hidden>
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <span className="lp-orbit__card-copy">
          <span className="lp-orbit__card-title">{feature.title}</span>
          <span className="lp-orbit__card-sub">{feature.subtitle}</span>
        </span>
      </article>
    </motion.div>
  );
}

function OrbitDot({
  rx,
  ry,
  duration,
  reverse,
  phase,
  speedMul,
  reduced,
}: {
  rx: number;
  ry: number;
  duration: number;
  reverse: boolean;
  phase: number;
  speedMul: MotionValue<number>;
  reduced: boolean;
}) {
  const angle = useMotionValue(phase);

  useEffect(() => {
    if (reduced) {
      angle.set(phase);
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      angle.set(
        angle.get() +
          ((Math.PI * 2) / duration) *
            dt *
            speedMul.get() *
            (reverse ? -1 : 1),
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [angle, duration, phase, reduced, reverse, speedMul]);

  const left = useTransform(angle, (a) => `calc(50% + ${Math.cos(a) * rx}%)`);
  const top = useTransform(angle, (a) => `calc(50% + ${Math.sin(a) * ry}%)`);

  return (
    <motion.span
      className="lp-orbit__dot"
      style={{ left, top, x: "-50%", y: "-50%" }}
      aria-hidden
    />
  );
}

export function LandingHeroOrbit() {
  const reduced = useReducedMotion() ?? false;
  const narrow = useIsNarrow(768);
  const { scrollY } = useScroll();

  const speedMul = useMotionValue(1);
  const sceneScale = useSpring(1, { stiffness: 120, damping: 28 });

  useEffect(() => {
    if (reduced || narrow) {
      sceneScale.set(1);
      speedMul.set(1);
      return;
    }
    return scrollY.on("change", (y) => {
      const t = Math.min(Math.max(y / 600, 0), 1);
      sceneScale.set(1 - t * 0.05);
      speedMul.set(1 + t * 0.35);
    });
  }, [narrow, reduced, sceneScale, scrollY, speedMul]);

  const orbits = narrow ? ORBIT_MOBILE : ORBIT_DESKTOP;
  const features = narrow
    ? FEATURES.filter((f) => MOBILE_FEATURE_IDS.has(f.id))
    : FEATURES;

  const featureMeta = features.map((f, i) => {
    const orbitIdx = narrow ? (f.orbit === 0 ? 0 : 1) : f.orbit;
    const cfg = orbits[Math.min(orbitIdx, orbits.length - 1)];
    const sameOrbit = features.filter((x) => {
      const oi = narrow ? (x.orbit === 0 ? 0 : 1) : x.orbit;
      return oi === orbitIdx;
    });
    const slot = sameOrbit.findIndex((x) => x.id === f.id);
    const phase =
      (slot / Math.max(sameOrbit.length, 1)) * Math.PI * 2 + i * 0.12;
    return { feature: f, cfg, phase };
  });

  const glowOpacity = useTransform(sceneScale, [0.95, 1], [0.28, 0.45]);
  const glow = useMotionTemplate`radial-gradient(ellipse 52% 48% at 50% 50%, rgba(16,185,129,${glowOpacity}) 0%, transparent 72%)`;

  return (
    <div className="lp-orbit" aria-hidden>
      <motion.div className="lp-orbit__scene" style={{ scale: sceneScale }}>
        <motion.div
          className="lp-orbit__glow"
          style={{ background: glow }}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
        />

        {orbits.map((cfg, i) => (
          <motion.div
            key={`ring-${i}`}
            className="lp-orbit__ring"
            style={
              {
                "--rx": `${cfg.rx}%`,
                "--ry": `${cfg.ry}%`,
              } as CSSProperties
            }
            initial={reduced ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 0.2 + i * 0.05, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.35 + i * 0.1 }}
          />
        ))}

        {!reduced &&
          orbits.map((cfg, i) => (
            <OrbitDot
              key={`dot-${i}`}
              rx={cfg.rx}
              ry={cfg.ry}
              duration={cfg.duration * 0.85}
              reverse={!cfg.reverse}
              phase={i * 1.7}
              speedMul={speedMul}
              reduced={reduced}
            />
          ))}

        <motion.div
          className="lp-orbit__core"
          initial={reduced ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="lp-orbit__logo-pad">
            <img
              src="/logo-batimum.png"
              alt=""
              className="lp-orbit__logo"
              width={64}
              height={64}
              decoding="async"
            />
          </div>
        </motion.div>

        {featureMeta.map(({ feature, cfg, phase }, index) => (
          <OrbitingCard
            key={feature.id}
            feature={feature}
            rx={cfg.rx}
            ry={cfg.ry}
            duration={cfg.duration}
            reverse={cfg.reverse}
            phase={phase}
            speedMul={speedMul}
            index={index}
            reduced={reduced}
          />
        ))}
      </motion.div>
    </div>
  );
}

"use client";

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

type OrbitCard = {
  id: string;
  title: string;
  subtitle: string;
  orbit: 0 | 1 | 2;
  angle: number;
  accent: string;
  Icon: typeof Sparkles;
};

const CARDS: OrbitCard[] = [
  {
    id: "devis",
    title: "Devis avec IA",
    subtitle: "Créés en quelques minutes",
    orbit: 2,
    angle: 10,
    accent: "#10B981",
    Icon: Sparkles,
  },
  {
    id: "planning",
    title: "Planning des équipes",
    subtitle: "Toujours à jour",
    orbit: 1,
    angle: 70,
    accent: "#A78BFA",
    Icon: CalendarDays,
  },
  {
    id: "chantiers",
    title: "Suivi des chantiers",
    subtitle: "En temps réel",
    orbit: 0,
    angle: 135,
    accent: "#60A5FA",
    Icon: Building2,
  },
  {
    id: "facturation",
    title: "Facturation",
    subtitle: "Simple et rapide",
    orbit: 2,
    angle: 195,
    accent: "#FB923C",
    Icon: Receipt,
  },
  {
    id: "clients",
    title: "Clients centralisés",
    subtitle: "Tout au même endroit",
    orbit: 1,
    angle: 250,
    accent: "#FBBF24",
    Icon: Users,
  },
  {
    id: "pilotage",
    title: "Pilotage et rentabilité",
    subtitle: "Décisions plus claires",
    orbit: 0,
    angle: 315,
    accent: "#059669",
    Icon: LayoutDashboard,
  },
];

const ORBIT_CFG = [
  { radiusPct: 21, duration: 28, reverse: false },
  { radiusPct: 33, duration: 34, reverse: true },
  { radiusPct: 40, duration: 40, reverse: false },
] as const;

const MOBILE_IDS = new Set(["devis", "planning", "chantiers", "pilotage"]);

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return mobile;
}

function useSceneSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState(700);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize(entry.contentRect.width);
    });
    ro.observe(el);
    setSize(el.clientWidth || 700);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function OrbitingCard({
  card,
  radiusPx,
  reverse,
  orbitRotate,
  index,
  staticMode,
}: {
  card: OrbitCard;
  radiusPx: number;
  reverse: boolean;
  orbitRotate: MotionValue<number>;
  index: number;
  staticMode: boolean;
}) {
  const Icon = card.Icon;
  const base = card.angle;

  const armRotate = useTransform(orbitRotate, (r) =>
    reverse ? -r + base : r + base,
  );
  const counterRotate = useTransform(orbitRotate, (r) =>
    reverse ? r - base : -r - base,
  );

  if (staticMode) {
    const rad = (base * Math.PI) / 180;
    const x = Math.cos(rad) * radiusPx;
    const y = Math.sin(rad) * radiusPx;
    return (
      <div
        className="batimumHero__cardWrap"
        style={{
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        }}
      >
        <article
          className="batimumHero__card"
          style={{ "--card-accent": card.accent } as CSSProperties}
        >
          <span className="batimumHero__cardIcon" aria-hidden>
            <Icon size={17} strokeWidth={1.8} />
          </span>
          <span className="batimumHero__cardCopy">
            <span className="batimumHero__cardTitle">{card.title}</span>
            <span className="batimumHero__cardSub">{card.subtitle}</span>
          </span>
        </article>
      </div>
    );
  }

  return (
    <motion.div
      className="batimumHero__arm"
      style={{
        width: radiusPx,
        rotate: armRotate,
        transformOrigin: "0% 50%",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, delay: 0.45 + index * 0.07 }}
    >
      <motion.div
        className="batimumHero__cardWrap batimumHero__cardWrap--live"
        style={{
          left: "100%",
          top: "50%",
          x: "-50%",
          y: "-50%",
          rotate: counterRotate,
        }}
        initial={{ scale: 0.96 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.025 }}
        transition={{ duration: 0.18 }}
      >
        <article
          className="batimumHero__card"
          style={{ "--card-accent": card.accent } as CSSProperties}
        >
          <span className="batimumHero__cardIcon" aria-hidden>
            <Icon size={17} strokeWidth={1.8} />
          </span>
          <span className="batimumHero__cardCopy">
            <span className="batimumHero__cardTitle">{card.title}</span>
            <span className="batimumHero__cardSub">{card.subtitle}</span>
          </span>
        </article>
      </motion.div>
    </motion.div>
  );
}

function OrbitDot({
  radiusPx,
  phase,
  duration,
  reverse,
  color,
  staticMode,
}: {
  radiusPx: number;
  phase: number;
  duration: number;
  reverse: boolean;
  color: string;
  staticMode: boolean;
}) {
  const rotate = useMotionValue(phase);

  useEffect(() => {
    if (staticMode) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      rotate.set(rotate.get() + (360 / duration) * dt * (reverse ? -1 : 1));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reverse, rotate, staticMode]);

  const x = useTransform(rotate, (deg) => Math.cos((deg * Math.PI) / 180) * radiusPx);
  const y = useTransform(rotate, (deg) => Math.sin((deg * Math.PI) / 180) * radiusPx);

  if (staticMode) {
    const rad = (phase * Math.PI) / 180;
    return (
      <span
        className="batimumHero__dot"
        style={{
          background: color,
          transform: `translate(-50%, -50%) translate(${Math.cos(rad) * radiusPx}px, ${Math.sin(rad) * radiusPx}px)`,
        }}
        aria-hidden
      />
    );
  }

  return (
    <motion.span
      className="batimumHero__dot"
      style={{ x, y, background: color }}
      aria-hidden
    />
  );
}

export function LandingHeroOrbit() {
  const reduced = useReducedMotion() ?? false;
  const mobile = useIsMobile(768);
  const sceneRef = useRef<HTMLDivElement>(null);
  const sceneSize = useSceneSize(sceneRef);
  const [mounted, setMounted] = useState(false);

  const rotate0 = useMotionValue(0);
  const rotate1 = useMotionValue(0);
  const rotate2 = useMotionValue(0);
  const orbitRotates = [rotate0, rotate1, rotate2];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (reduced || !mounted) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ORBIT_CFG.forEach((cfg, i) => {
        const delta = (360 / cfg.duration) * dt * (cfg.reverse ? -1 : 1);
        orbitRotates[i].set((orbitRotates[i].get() + delta) % 360);
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mounted, reduced, rotate0, rotate1, rotate2]);

  const staticMode = !mounted || reduced;
  const cards = mobile ? CARDS.filter((c) => MOBILE_IDS.has(c.id)) : CARDS;
  const pills = mobile ? CARDS.filter((c) => !MOBILE_IDS.has(c.id)) : [];

  return (
    <div className="batimumHero__orbitRoot">
      <div ref={sceneRef} className="batimumHero__orbit">
        <motion.div
          className="batimumHero__glow"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />

        {[0, 1, 2].map((i) => (
          <motion.div
            key={`ring-${i}`}
            className={`batimumHero__ring batimumHero__ring--${i}`}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.25 + i * 0.08 }}
          />
        ))}

        {ORBIT_CFG.map((cfg, i) => (
          <OrbitDot
            key={`dot-${i}`}
            radiusPx={sceneSize * (cfg.radiusPct / 100)}
            phase={i * 80}
            duration={cfg.duration * 0.9}
            reverse={!cfg.reverse}
            color={
              i === 0
                ? "rgba(16,185,129,0.55)"
                : i === 1
                  ? "rgba(96,165,250,0.45)"
                  : "rgba(167,139,250,0.4)"
            }
            staticMode={staticMode}
          />
        ))}

        <motion.div
          className="batimumHero__logoCore"
          style={{ left: "50%", top: "50%", x: "-50%", y: "-50%" }}
          initial={reduced ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="batimumHero__logoPad">
            <img
              src="/logo-batimum.png"
              alt=""
              className="batimumHero__logoImg"
              width={62}
              height={62}
              decoding="async"
            />
          </div>
        </motion.div>

        {cards.map((card, index) => {
          const cfg = ORBIT_CFG[card.orbit];
          const radiusScale = mobile ? 0.88 : 1;
          return (
            <OrbitingCard
              key={card.id}
              card={card}
              radiusPx={sceneSize * (cfg.radiusPct / 100) * radiusScale}
              reverse={cfg.reverse}
              orbitRotate={orbitRotates[card.orbit]}
              index={index}
              staticMode={staticMode}
            />
          );
        })}
      </div>

      {pills.length > 0 ? (
        <ul className="batimumHero__pills" aria-label="Autres fonctionnalités">
          {pills.map((card) => {
            const Icon = card.Icon;
            return (
              <li key={card.id} className="batimumHero__pill">
                <Icon size={14} strokeWidth={1.8} aria-hidden />
                <span>{card.title}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

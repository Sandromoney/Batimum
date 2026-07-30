"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { MumFilmPhase } from "@/components/landing/landing-hub-mum-film";

type FocusId =
  | "mum"
  | "clients"
  | "planning"
  | "chantiers"
  | "finance"
  | null;

type AtmosphereMood = {
  /** Attraction douce vers le centre (apparition logo). */
  attract: number;
  /** Dérive directionnelle (entrée caméra module). */
  driftX: number;
  driftY: number;
  /** Densité / vivacité globale. */
  energy: number;
};

type Particle = {
  x: number;
  y: number;
  z: number; // 0 far → 1 near
  r: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  life: number;
  lifeSpeed: number;
  phase: number;
  opacity: number;
  baseOpacity: number;
  cluster: number; // -1 free, else cluster id
};

type Cluster = {
  cx: number;
  cy: number;
  angle: number;
  radius: number;
  strength: number;
  life: number;
  maxLife: number;
};

/** PRNG déterministe (mulberry32) — jamais Math.random dans le cycle de rendu. */
function createSeededRandom(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function moodFromScene(
  scene: number,
  filmPhase: MumFilmPhase,
  focusId: FocusId,
): AtmosphereMood {
  const deep =
    filmPhase === "enter" ||
    filmPhase === "demo" ||
    filmPhase === "hold";
  const highlight = filmPhase === "highlight";

  let driftX = 0;
  let driftY = 0;
  if (deep || highlight) {
    if (focusId === "mum") {
      driftX = deep ? 0.35 : 0.12;
      driftY = deep ? 0.28 : 0.1;
    } else if (focusId === "clients") {
      driftX = deep ? -0.36 : -0.14;
      driftY = deep ? 0.08 : 0.03;
    } else if (focusId === "planning") {
      driftX = deep ? -0.32 : -0.12;
      driftY = deep ? 0.22 : 0.08;
    } else if (focusId === "chantiers") {
      driftX = deep ? -0.18 : -0.08;
      driftY = deep ? 0.34 : 0.12;
    } else if (focusId === "finance") {
      driftX = deep ? 0.28 : 0.1;
      driftY = deep ? -0.24 : -0.08;
    }
  }

  const attract =
    scene === 1 ? 0.55 : scene === 2 && filmPhase === "idle" ? 0.18 : 0.06;

  const energy =
    filmPhase === "signature" || filmPhase === "sealed"
      ? 0.55
      : deep
        ? 0.7
        : scene >= 2
          ? 1
          : scene >= 1
            ? 0.85
            : 0.45;

  return { attract, driftX, driftY, energy };
}

function createParticles(
  w: number,
  h: number,
  count: number,
  rand: () => number,
): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const z = rand();
    const spark = rand() < 0.1;
    const baseOpacity = spark
      ? 0.28 + z * 0.22 + rand() * 0.12
      : 0.14 + z * 0.18 + rand() * 0.08;
    list.push({
      x: rand() * w,
      y: rand() * h,
      z,
      r: spark
        ? 1.05 + z * 1.15 + rand() * 0.45
        : 0.65 + z * 0.95 + rand() * 0.4,
      ox: (rand() - 0.5) * 0.09,
      oy: (rand() - 0.5) * 0.08,
      vx: (rand() - 0.5) * 0.018,
      vy: (rand() - 0.5) * 0.014,
      life: rand(),
      lifeSpeed: 0.00005 + rand() * 0.00012,
      phase: rand() * Math.PI * 2,
      opacity: baseOpacity,
      baseOpacity,
      cluster: -1,
    });
  }
  return list;
}

/** Fond crème + pointillisme CSS — toujours visible, zéro dépendance canvas. */
export function HubAtmosphereFallback() {
  return (
    <div
      className="lp-hub__atmosphere lp-hub__atmosphere--static lp-hub__atmosphere--fallback"
      aria-hidden="true"
    />
  );
}

/**
 * Fond vivant du Hub — micro-points sur crème.
 * Discret, technologique, jamais spatial / science-fiction.
 * Le canvas ne peut jamais masquer / planter la page : fallback crème toujours présent.
 */
export function HubAtmosphere({
  containerRef,
  scene,
  filmPhase,
  focusId,
  reduced,
  enabled = true,
}: {
  containerRef: RefObject<HTMLElement | null>;
  scene: number;
  filmPhase: MumFilmPhase;
  focusId: FocusId;
  reduced: boolean | null;
  enabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const moodRef = useRef<AtmosphereMood>(moodFromScene(scene, filmPhase, focusId));
  const rafRef = useRef(0);
  const [canvasFailed, setCanvasFailed] = useState(false);

  const showCanvas = Boolean(enabled && !reduced && !canvasFailed);

  useEffect(() => {
    moodRef.current = moodFromScene(scene, filmPhase, focusId);
  }, [scene, filmPhase, focusId]);

  useEffect(() => {
    if (!showCanvas) return;
    const canvas = canvasRef.current;
    const host = containerRef.current;
    if (!canvas || !host) return;

    let running = true;
    let ro: ResizeObserver | null = null;

    try {
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) {
        setCanvasFailed(true);
        return;
      }

      let w = 0;
      let h = 0;
      let dpr = 1;
      let particles: Particle[] = [];
      let clusters: Cluster[] = [];
      let lastClusterAt = performance.now();
      let clusterRand = createSeededRandom(0xc0ffee);

      const resize = () => {
        const rect = host.getBoundingClientRect();
        w = Math.max(1, Math.floor(rect.width));
        h = Math.max(1, Math.floor(rect.height));
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const area = w * h;
        const density = area < 500_000 ? 0.0032 : area < 1_000_000 ? 0.0038 : 0.0044;
        const count = Math.min(5600, Math.max(2200, Math.floor(area * density)));
        // Seed tied to dimensions → stable field for a given viewport size
        const seed = (w * 73856093) ^ (h * 19349663) ^ 0xa5a5a5a5;
        const rand = createSeededRandom(seed >>> 0);
        clusterRand = createSeededRandom((seed ^ 0x9e3779b9) >>> 0);
        particles = createParticles(w, h, count, rand);
        clusters = [];
      };

      const onMove = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        mouseRef.current.tx = (event.clientX - rect.left) / rect.width;
        mouseRef.current.ty = (event.clientY - rect.top) / rect.height;
      };

      const spawnCluster = (now: number) => {
        if (clusters.length >= 2) return;
        if (now - lastClusterAt < 6400 + clusterRand() * 5200) return;
        lastClusterAt = now;
        const maxLife = 3400 + clusterRand() * 2800;
        clusters.push({
          cx: w * (0.28 + clusterRand() * 0.44),
          cy: h * (0.25 + clusterRand() * 0.5),
          angle: clusterRand() * Math.PI * 2,
          radius: 42 + clusterRand() * 68,
          strength: 0,
          life: 0,
          maxLife,
        });
      };

      const tick = (now: number) => {
        if (!running) return;
        try {
          const mood = moodRef.current;
          const mouse = mouseRef.current;
          mouse.x += (mouse.tx - mouse.x) * 0.04;
          mouse.y += (mouse.ty - mouse.y) * 0.04;

          const mx = (mouse.x - 0.5) * 2;
          const my = (mouse.y - 0.5) * 2;
          const cx = w * 0.5;
          const cy = h * 0.5;

          spawnCluster(now);

          ctx.clearRect(0, 0, w, h);

          for (const cluster of clusters) {
            cluster.life += 16;
            const t = cluster.life / cluster.maxLife;
            cluster.strength =
              t < 0.25 ? t / 0.25 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
            cluster.angle += 0.00028;
          }
          clusters = clusters.filter((c) => c.life < c.maxLife);

          for (const p of particles) {
            p.phase += 0.0028 + p.z * 0.0022;
            p.life += p.lifeSpeed;
            if (p.life > 1) p.life = 0;

            const breathe = 0.72 + 0.28 * Math.sin(p.phase);
            const fade =
              p.life < 0.1
                ? p.life / 0.1
                : p.life > 0.9
                  ? (1 - p.life) / 0.1
                  : 1;
            p.opacity = p.baseOpacity * breathe * fade * (0.75 + mood.energy * 0.25);

            p.x += p.vx + p.ox * Math.sin(p.phase * 0.55) * 0.1;
            p.y += p.vy + p.oy * Math.cos(p.phase * 0.42) * 0.1;

            if (mood.attract > 0.01) {
              p.x += (cx - p.x) * 0.00028 * mood.attract * (0.4 + p.z);
              p.y += (cy - p.y) * 0.00028 * mood.attract * (0.4 + p.z);
            }

            p.x += mood.driftX * (0.03 + p.z * 0.06);
            p.y += mood.driftY * (0.03 + p.z * 0.06);

            for (const cluster of clusters) {
              if (cluster.strength < 0.1) continue;
              const dx = p.x - cluster.cx;
              const dy = p.y - cluster.cy;
              const dist = Math.hypot(dx, dy) || 1;
              if (dist < cluster.radius * 1.5) {
                const targetAngle = cluster.angle + p.phase * 0.35;
                const tx =
                  cluster.cx + Math.cos(targetAngle) * cluster.radius * 0.5;
                const ty =
                  cluster.cy + Math.sin(targetAngle) * cluster.radius * 0.5;
                p.x += (tx - p.x) * 0.008 * cluster.strength;
                p.y += (ty - p.y) * 0.008 * cluster.strength;
              }
            }

            if (p.x < -8) p.x = w + 8;
            if (p.x > w + 8) p.x = -8;
            if (p.y < -8) p.y = h + 8;
            if (p.y > h + 8) p.y = -8;

            const parx = mx * (2.4 + p.z * 4.5);
            const pary = my * (1.8 + p.z * 3.5);
            const alpha = Math.min(0.5, p.opacity * 1.15);
            if (alpha < 0.04) continue;

            const g = 58 + Math.floor(p.z * 40);
            ctx.beginPath();
            ctx.fillStyle = `rgba(${g}, ${g - 2}, ${g - 8}, ${alpha})`;
            ctx.arc(p.x + parx, p.y + pary, p.r, 0, Math.PI * 2);
            ctx.fill();
          }

          rafRef.current = requestAnimationFrame(tick);
        } catch (err) {
          running = false;
          if (process.env.NODE_ENV === "development") {
            console.error("[HubAtmosphere] tick failed", err);
          }
          setCanvasFailed(true);
        }
      };

      resize();
      ro = new ResizeObserver(resize);
      ro.observe(host);
      host.addEventListener("pointermove", onMove, { passive: true });
      rafRef.current = requestAnimationFrame(tick);

      return () => {
        running = false;
        cancelAnimationFrame(rafRef.current);
        ro?.disconnect();
        host.removeEventListener("pointermove", onMove);
      };
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[HubAtmosphere] setup failed", err);
      }
      setCanvasFailed(true);
      return () => {
        running = false;
        cancelAnimationFrame(rafRef.current);
        ro?.disconnect();
      };
    }
  }, [containerRef, showCanvas]);

  return (
    <>
      <HubAtmosphereFallback />
      {showCanvas ? (
        <canvas
          ref={canvasRef}
          className="lp-hub__atmosphere lp-hub__atmosphere--canvas"
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

/** Orbites pointillées incomplètes autour du BM. */
export function HubOrbitRings({
  visible,
  reduced,
}: {
  visible: boolean;
  reduced: boolean | null;
}) {
  return (
    <div
      className={[
        "lp-hub__rings",
        visible ? "is-on" : "",
        reduced ? "is-static" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <span className="lp-hub__ring lp-hub__ring--a" />
      <span className="lp-hub__ring lp-hub__ring--b" />
      <span className="lp-hub__ring lp-hub__ring--c" />
    </div>
  );
}

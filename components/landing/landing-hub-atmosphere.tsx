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
  | "pilotage"
  | null;

type AtmosphereMood = {
  /** Attraction très faible vers le centre (jamais d’amas). */
  attract: number;
  driftX: number;
  driftY: number;
  energy: number;
};

type Particle = {
  /** Position home — ancre stable, pas de regroupement. */
  hx: number;
  hy: number;
  x: number;
  y: number;
  z: number;
  r: number;
  /** Vitesse de dérive (px / frame @60fps, très faible). */
  vx: number;
  vy: number;
  /** Rayon d’orbite micro autour du home. */
  orbitR: number;
  orbitSpeed: number;
  phase: number;
  baseOpacity: number;
  breatheSpeed: number;
};

/** Connexion neuronale éphémère entre deux indices. */
type NeuralLink = {
  a: number;
  b: number;
  life: number;
  maxLife: number;
};

/** Micro-groupe qui tourne brièvement (effet « réflexion IA »). */
type AiPulse = {
  cx: number;
  cy: number;
  indices: number[];
  life: number;
  maxLife: number;
  angle: number;
  speed: number;
};

/** PRNG déterministe (mulberry32) — jamais Math.random dans le render React. */
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
    const k = deep ? 0.12 : 0.045;
    if (focusId === "mum") {
      driftX = k;
      driftY = k * 0.8;
    } else if (focusId === "clients") {
      driftX = -k;
      driftY = k * 0.25;
    } else if (focusId === "planning") {
      driftX = -k * 0.9;
      driftY = k * 0.7;
    } else if (focusId === "chantiers") {
      driftX = -k * 0.5;
      driftY = k;
    } else if (focusId === "finance") {
      driftX = k * 0.85;
      driftY = -k * 0.7;
    } else if (focusId === "pilotage") {
      driftX = -k * 0.6;
      driftY = -k * 0.85;
    }
  }

  // Attraction centre très douce — pas assez pour former un amas visible
  const attract =
    scene === 1 ? 0.12 : scene === 2 && filmPhase === "idle" ? 0.04 : 0.015;

  const energy =
    filmPhase === "signature" || filmPhase === "sealed"
      ? 0.55
      : deep
        ? 0.7
        : scene >= 2
          ? 0.85
          : scene >= 1
            ? 0.7
            : 0.45;

  return { attract, driftX, driftY, energy };
}

/**
 * Répartition naturelle : grille jitterée (évite les trous et les paquets).
 * Points fins, opacité basse — visibles seulement si on regarde vraiment le fond.
 */
function createParticles(
  w: number,
  h: number,
  count: number,
  rand: () => number,
): Particle[] {
  const list: Particle[] = [];
  const cols = Math.max(8, Math.round(Math.sqrt(count * (w / Math.max(h, 1)))));
  const rows = Math.max(8, Math.ceil(count / cols));
  const cellW = w / cols;
  const cellH = h / rows;
  let n = 0;

  for (let row = 0; row < rows && n < count; row++) {
    for (let col = 0; col < cols && n < count; col++) {
      // Jitter faible → champ homogène, pas de nuages locaux
      const jitterX = (rand() - 0.5) * cellW * 0.38;
      const jitterY = (rand() - 0.5) * cellH * 0.38;
      const hx = (col + 0.5) * cellW + jitterX;
      const hy = (row + 0.5) * cellH + jitterY;
      const z = 0.25 + rand() * 0.55; // moins d’extrêmes → opacité plus uniforme
      // Très fins : ~0.4–0.85 px
      const r = 0.4 + z * 0.3 + rand() * 0.12;
      // Opacité discrète et stable — pas de « sparks » qui font tache
      const baseOpacity = 0.06 + z * 0.04 + rand() * 0.02;
      list.push({
        hx,
        hy,
        x: hx,
        y: hy,
        z,
        r,
        vx: (rand() - 0.5) * 0.012,
        vy: (rand() - 0.5) * 0.01,
        orbitR: 0.8 + rand() * 2.4,
        orbitSpeed: 0.0003 + rand() * 0.00045,
        phase: rand() * Math.PI * 2,
        baseOpacity,
        breatheSpeed: 0.004 + rand() * 0.006,
      });
      n++;
    }
  }
  return list;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
 * Ambiance IA premium : discret, élégant, jamais la vedette.
 */
export function HubAtmosphere({
  containerRef,
  scene,
  filmPhase,
  focusId,
  reduced,
  enabled = true,
  paused = false,
}: {
  containerRef: RefObject<HTMLElement | null>;
  scene: number;
  filmPhase: MumFilmPhase;
  focusId: FocusId;
  reduced: boolean | null;
  enabled?: boolean;
  /** Ralentit la dérive des particules sans les figer. */
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const moodRef = useRef<AtmosphereMood>(moodFromScene(scene, filmPhase, focusId));
  const pausedRef = useRef(paused);
  const rafRef = useRef(0);
  const [canvasFailed, setCanvasFailed] = useState(false);

  const showCanvas = Boolean(enabled && !reduced && !canvasFailed);

  useEffect(() => {
    moodRef.current = moodFromScene(scene, filmPhase, focusId);
  }, [scene, filmPhase, focusId]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!showCanvas) return;
    const canvas = canvasRef.current;
    const host = containerRef.current;
    if (!canvas || !host) return;

    let running = true;
    let ro: ResizeObserver | null = null;

    try {
      const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!ctx) {
        setCanvasFailed(true);
        return;
      }

      let w = 0;
      let h = 0;
      let dpr = 1;
      let particles: Particle[] = [];
      let links: NeuralLink[] = [];
      let pulses: AiPulse[] = [];
      let lastLinkAt = 0;
      let lastPulseAt = 0;
      let eventRand = createSeededRandom(0x51a1);

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

        // Densité légère — texture fine homogène, jamais un nuage
        const area = w * h;
        const density = area < 500_000 ? 0.0009 : area < 1_000_000 ? 0.001 : 0.0011;
        const count = Math.min(1500, Math.max(520, Math.floor(area * density)));
        const seed = (w * 73856093) ^ (h * 19349663) ^ 0xb10bf00d;
        const rand = createSeededRandom(seed >>> 0);
        eventRand = createSeededRandom((seed ^ 0x9e3779b9) >>> 0);
        particles = createParticles(w, h, count, rand);
        links = [];
        pulses = [];
        lastLinkAt = performance.now();
        lastPulseAt = performance.now();
      };

      const onMove = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        mouseRef.current.tx = (event.clientX - rect.left) / rect.width;
        mouseRef.current.ty = (event.clientY - rect.top) / rect.height;
      };

      /** Trouve un voisin proche sans grille lourde — échantillonnage aléatoire. */
      const findNearby = (i: number, maxDist: number): number | null => {
        const p = particles[i];
        if (!p) return null;
        const max2 = maxDist * maxDist;
        let best = -1;
        let bestD = max2;
        const samples = 28;
        for (let s = 0; s < samples; s++) {
          const j = (Math.floor(eventRand() * particles.length) + i + 1) % particles.length;
          if (j === i) continue;
          const q = particles[j];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD && d2 > 16) {
            bestD = d2;
            best = j;
          }
        }
        return best >= 0 ? best : null;
      };

      const spawnLinks = (now: number) => {
        if (links.length >= 5) return;
        // Rare : ~toutes les 2.8–5.5 s
        if (now - lastLinkAt < 2800 + eventRand() * 2700) return;
        lastLinkAt = now;
        const count = 1 + (eventRand() < 0.35 ? 1 : 0);
        for (let n = 0; n < count && links.length < 5; n++) {
          const i = Math.floor(eventRand() * particles.length);
          const j = findNearby(i, 72);
          if (j == null) continue;
          // Éviter doublons
          if (links.some((l) => (l.a === i && l.b === j) || (l.a === j && l.b === i))) {
            continue;
          }
          links.push({
            a: i,
            b: j,
            life: 0,
            maxLife: 900 + eventRand() * 1100,
          });
        }
      };

      const spawnPulse = (now: number) => {
        if (pulses.length >= 1) return;
        // Très rare : ~toutes les 9–16 s
        if (now - lastPulseAt < 9000 + eventRand() * 7000) return;
        lastPulseAt = now;
        const cx = w * (0.3 + eventRand() * 0.4);
        const cy = h * (0.28 + eventRand() * 0.44);
        const radius = 36 + eventRand() * 28;
        const indices: number[] = [];
        for (let i = 0; i < particles.length && indices.length < 5; i++) {
          const p = particles[i];
          const dx = p.x - cx;
          const dy = p.y - cy;
          if (dx * dx + dy * dy < radius * radius) {
            // Sous-échantillonner pour rester subtil
            if (eventRand() < 0.22) indices.push(i);
          }
        }
        if (indices.length < 3) return;
        pulses.push({
          cx,
          cy,
          indices: indices.slice(0, 5),
          life: 0,
          maxLife: 2200 + eventRand() * 1600,
          angle: 0,
          speed: 0.00055 + eventRand() * 0.00035,
        });
      };

      const tick = (now: number) => {
        if (!running) return;
        try {
          const mood = moodRef.current;
          const mouse = mouseRef.current;
          mouse.x += (mouse.tx - mouse.x) * 0.035;
          mouse.y += (mouse.ty - mouse.y) * 0.035;

          const mx = (mouse.x - 0.5) * 2;
          const my = (mouse.y - 0.5) * 2;
          const cx = w * 0.5;
          const cy = h * 0.5;

          spawnLinks(now);
          spawnPulse(now);

          // Mise à jour pulses
          for (const pulse of pulses) {
            pulse.life += 16;
            pulse.angle += pulse.speed;
          }
          pulses = pulses.filter((p) => p.life < p.maxLife);

          // Mise à jour links
          for (const link of links) {
            link.life += 16;
          }
          links = links.filter((l) => l.life < l.maxLife);

          ctx.clearRect(0, 0, w, h);

          // Dessiner d’abord les liens (sous les points)
          for (const link of links) {
            const a = particles[link.a];
            const b = particles[link.b];
            if (!a || !b) continue;
            const t = link.life / link.maxLife;
            const fade = t < 0.2 ? t / 0.2 : t > 0.65 ? Math.max(0, (1 - t) / 0.35) : 1;
            const alpha = 0.045 * fade * (0.7 + mood.energy * 0.3);
            if (alpha < 0.008) continue;
            const pax = a.x + mx * (0.6 + a.z * 1.1);
            const pay = a.y + my * (0.45 + a.z * 0.85);
            const pbx = b.x + mx * (0.6 + b.z * 1.1);
            const pby = b.y + my * (0.45 + b.z * 0.85);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100, 110, 125, ${alpha})`;
            ctx.lineWidth = 0.45;
            ctx.moveTo(pax, pay);
            ctx.lineTo(pbx, pby);
            ctx.stroke();
          }

          // Index rapide pour savoir si une particule est dans un pulse
          const pulseStrength = new Map<number, { cx: number; cy: number; s: number; ang: number }>();
          for (const pulse of pulses) {
            const t = pulse.life / pulse.maxLife;
            const s = easeInOut(t < 0.25 ? t / 0.25 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1);
            for (const idx of pulse.indices) {
              pulseStrength.set(idx, {
                cx: pulse.cx,
                cy: pulse.cy,
                s,
                ang: pulse.angle,
              });
            }
          }

          const speedScale = pausedRef.current ? 0.22 : 1;

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.phase += p.breatheSpeed * speedScale;

            // Home dérive très lentement (champ vivant, sans amas)
            p.hx += (p.vx + mood.driftX * (0.008 + p.z * 0.012)) * speedScale;
            p.hy += (p.vy + mood.driftY * (0.008 + p.z * 0.012)) * speedScale;

            // Soft wrap du home
            if (p.hx < -12) p.hx = w + 12;
            if (p.hx > w + 12) p.hx = -12;
            if (p.hy < -12) p.hy = h + 12;
            if (p.hy > h + 12) p.hy = -12;

            // Micro-orbite autour du home
            const ox = Math.cos(p.phase * p.orbitSpeed * 60 + p.phase) * p.orbitR;
            const oy = Math.sin(p.phase * p.orbitSpeed * 48 + p.phase * 1.3) * p.orbitR * 0.85;

            let tx = p.hx + ox;
            let ty = p.hy + oy;

            // Attraction centre très faible
            if (mood.attract > 0.01) {
              tx += (cx - tx) * 0.00008 * mood.attract * (0.35 + p.z);
              ty += (cy - ty) * 0.00008 * mood.attract * (0.35 + p.z);
            }

            // Pulse IA : rotation discrète autour d’un centre local
            const pul = pulseStrength.get(i);
            if (pul && pul.s > 0.01) {
              const dx = tx - pul.cx;
              const dy = ty - pul.cy;
              const rot = pul.ang * pul.s * 0.35;
              const cos = Math.cos(rot);
              const sin = Math.sin(rot);
              tx = pul.cx + dx * cos - dy * sin;
              ty = pul.cy + dx * sin + dy * cos;
            }

            // Lerp doux vers la cible (évite les sauts)
            p.x += (tx - p.x) * 0.06;
            p.y += (ty - p.y) * 0.06;

            // Respiration d’opacité — amplitude faible
            const breathe = 0.82 + 0.18 * Math.sin(p.phase);
            const alpha = Math.min(
              0.16,
              p.baseOpacity * breathe * (0.88 + mood.energy * 0.12),
            );
            if (alpha < 0.025) continue;

            // Parallaxe très faible
            const parx = mx * (0.55 + p.z * 1.15);
            const pary = my * (0.4 + p.z * 0.9);

            // Point net (pas d’arc soft) — rendu technologique, pas de halo « tache »
            const g = 120 + Math.floor(p.z * 40);
            const px = Math.round(p.x + parx);
            const py = Math.round(p.y + pary);
            const size = p.r < 0.55 ? 1 : p.r < 0.75 ? 1.25 : 1.5;
            ctx.fillStyle = `rgba(${g}, ${g + 2}, ${g + 6}, ${alpha})`;
            ctx.fillRect(px, py, size, size);
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
      {!showCanvas ? <HubAtmosphereFallback /> : null}
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

/**
 * Timeline nominale de la présentation hub (autoplay).
 * Cible durée totale ~2 min 05–2 min 15 (plafond 2 min 20).
 */

export const MODULE_LOCK_MS = 880;
export const AUTO_BREATH_MS = 420;
export const AUTO_PLAN_BREATH_MS = 280;
export const HOLD_MS = 950;
export const INTRO_MS = 11000;

export const MUM_ENTER_MS = 880;
export const MUM_RETURN_MS = 1000;
export const CLIENTS_ENTER_MS = 880;
export const CLIENTS_RETURN_MS = 1000;
export const CHANTIER_ENTER_MS = 880;
export const CHANTIER_RETURN_MS = 1000;
export const PLAN_ENTER_MS = 880;
export const PLAN_RETURN_MS = 1000;
export const FIN_ENTER_MS = 880;
export const FIN_RETURN_MS = 1000;
export const FIN_CONVERGE_MS = 1600;
export const PILOTAGE_ENTER_MS = 840;
export const PILOTAGE_RETURN_MS = 980;

/** Conclusion : disparition horaire → écrou → verrouillage → CTA */
export const SIG_DISMISS_EACH_MS = 820;
export const SIG_DISMISS_COUNT = 6;
export const SIG_DISMISS_TOTAL_MS = SIG_DISMISS_EACH_MS * SIG_DISMISS_COUNT;
export const SIG_SOLO_MS = 480;
export const SIG_APPROACH_MS = 1400;
export const SIG_SCREW_MS = 2200;
export const SIG_PULSE_MS = 600;
export const SIG_COPY_MS = 1300;
export const SIG_CTA_MS = 800;
export const SIG_HOLD_MS = 550;

export const SIG_DEMO_SAFETY_MS =
  SIG_DISMISS_TOTAL_MS +
  SIG_SOLO_MS +
  SIG_APPROACH_MS +
  SIG_SCREW_MS +
  SIG_PULSE_MS +
  SIG_COPY_MS +
  SIG_CTA_MS +
  SIG_HOLD_MS;

/** Lecture module — assez longue pour une TPE BTP. */
function readMs(copyLen: number) {
  return Math.round(Math.min(2400, Math.max(1400, 900 + copyLen * 14)));
}

function modulePreMs(enterMs: number, copyLen: number) {
  return MODULE_LOCK_MS + enterMs + readMs(copyLen);
}

/**
 * Durées de démo : actions fluides, résultats tenus via HOLD_MS
 * (pas un ralenti artificiel de chaque tween).
 */
export const DEMO_MS = {
  mumPlans: [5000, 1500, 2200, 1300, 4500, 6400] as const,
  clients: 6800,
  chantiers: 8500,
  planning: 9800,
  finance: 8200,
  pilotage: 7200,
} as const;

export type HubFilmModule =
  | "mum"
  | "clients"
  | "chantiers"
  | "planning"
  | "finance"
  | "pilotage";

export type TimelineHit = {
  timeMs: number;
  scene: number;
  offsetMs: number;
  kind:
    | "intro"
    | "modulePre"
    | "moduleDemo"
    | "moduleReturn"
    | "converge"
    | "signature";
  module: HubFilmModule | null;
  mumPlan: number;
  filmPhase:
    | "highlight"
    | "enter"
    | "demo"
    | "hold"
    | "returning"
    | "converge"
    | "signature"
    | "idle";
  demoOffsetMs: number;
  preOffsetMs: number;
};

export type Seg = {
  start: number;
  duration: number;
  scene: number;
  kind: TimelineHit["kind"];
  module: HubFilmModule | null;
  mumPlan: number;
};

function buildSegments(): Seg[] {
  const segs: Seg[] = [];
  let t = 0;

  const push = (seg: Omit<Seg, "start">) => {
    segs.push({ ...seg, start: t });
    t += seg.duration;
  };

  push({ duration: INTRO_MS, scene: 1, kind: "intro", module: null, mumPlan: 0 });

  const mumPre = modulePreMs(MUM_ENTER_MS, 56);
  push({
    duration: mumPre,
    scene: 3,
    kind: "modulePre",
    module: "mum",
    mumPlan: 0,
  });

  DEMO_MS.mumPlans.forEach((dur, plan) => {
    push({
      duration:
        dur +
        HOLD_MS +
        (plan < DEMO_MS.mumPlans.length - 1 ? AUTO_PLAN_BREATH_MS : AUTO_BREATH_MS),
      scene: 3,
      kind: "moduleDemo",
      module: "mum",
      mumPlan: plan,
    });
  });

  push({
    duration: MUM_RETURN_MS + AUTO_BREATH_MS,
    scene: 4,
    kind: "moduleReturn",
    module: "mum",
    mumPlan: 0,
  });

  const modules: {
    module: HubFilmModule;
    enter: number;
    demo: number;
    ret: number;
    copyLen: number;
    sceneIn: number;
    sceneOut: number;
  }[] = [
    {
      module: "clients",
      enter: CLIENTS_ENTER_MS,
      demo: DEMO_MS.clients,
      ret: CLIENTS_RETURN_MS,
      copyLen: 62,
      sceneIn: 5,
      sceneOut: 6,
    },
    {
      module: "chantiers",
      enter: CHANTIER_ENTER_MS,
      demo: DEMO_MS.chantiers,
      ret: CHANTIER_RETURN_MS,
      copyLen: 58,
      sceneIn: 7,
      sceneOut: 8,
    },
    {
      module: "planning",
      enter: PLAN_ENTER_MS,
      demo: DEMO_MS.planning,
      ret: PLAN_RETURN_MS,
      copyLen: 62,
      sceneIn: 9,
      sceneOut: 10,
    },
    {
      module: "finance",
      enter: FIN_ENTER_MS,
      demo: DEMO_MS.finance,
      ret: FIN_RETURN_MS,
      copyLen: 58,
      sceneIn: 11,
      sceneOut: 12,
    },
    {
      module: "pilotage",
      enter: PILOTAGE_ENTER_MS,
      demo: DEMO_MS.pilotage,
      ret: PILOTAGE_RETURN_MS,
      copyLen: 62,
      sceneIn: 13,
      sceneOut: 14,
    },
  ];

  for (const m of modules) {
    push({
      duration: modulePreMs(m.enter, m.copyLen),
      scene: m.sceneIn,
      kind: "modulePre",
      module: m.module,
      mumPlan: 0,
    });
    push({
      duration: m.demo + HOLD_MS + AUTO_BREATH_MS,
      scene: m.sceneIn,
      kind: "moduleDemo",
      module: m.module,
      mumPlan: 0,
    });
    push({
      duration: m.ret + AUTO_BREATH_MS,
      scene: m.sceneOut,
      kind: "moduleReturn",
      module: m.module,
      mumPlan: 0,
    });
  }

  push({
    duration: FIN_CONVERGE_MS + AUTO_BREATH_MS,
    scene: 15,
    kind: "converge",
    module: null,
    mumPlan: 0,
  });

  push({
    duration: SIG_DEMO_SAFETY_MS + 400,
    scene: 16,
    kind: "signature",
    module: null,
    mumPlan: 0,
  });

  return segs;
}

export const HUB_TIMELINE_SEGMENTS = buildSegments();
export const HUB_FILM_TOTAL_MS =
  HUB_TIMELINE_SEGMENTS[HUB_TIMELINE_SEGMENTS.length - 1].start +
  HUB_TIMELINE_SEGMENTS[HUB_TIMELINE_SEGMENTS.length - 1].duration;

function phaseForPre(
  offsetMs: number,
  enterMs: number,
  copyLen: number,
): TimelineHit["filmPhase"] {
  const read = readMs(copyLen);
  if (offsetMs < MODULE_LOCK_MS) return "highlight";
  if (offsetMs < MODULE_LOCK_MS + enterMs + read) return "enter";
  return "demo";
}

function copyLenFor(module: HubFilmModule | null) {
  if (module === "mum") return 56;
  if (module === "clients" || module === "planning" || module === "pilotage")
    return 62;
  return 58;
}

function enterMsFor(module: HubFilmModule | null) {
  if (module === "mum") return MUM_ENTER_MS;
  if (module === "clients") return CLIENTS_ENTER_MS;
  if (module === "chantiers") return CHANTIER_ENTER_MS;
  if (module === "planning") return PLAN_ENTER_MS;
  if (module === "finance") return FIN_ENTER_MS;
  if (module === "pilotage") return PILOTAGE_ENTER_MS;
  return MUM_ENTER_MS;
}

export function resolveTimeline(timeMs: number): TimelineHit {
  const t = Math.max(0, Math.min(timeMs, HUB_FILM_TOTAL_MS - 1));
  const seg =
    HUB_TIMELINE_SEGMENTS.find(
      (s) => t >= s.start && t < s.start + s.duration,
    ) ?? HUB_TIMELINE_SEGMENTS[HUB_TIMELINE_SEGMENTS.length - 1];
  const offsetMs = t - seg.start;
  const enter = enterMsFor(seg.module);
  const copyLen = copyLenFor(seg.module);

  if (seg.kind === "intro") {
    return {
      timeMs: t,
      scene: offsetMs < INTRO_MS * 0.42 ? 1 : 2,
      offsetMs,
      kind: "intro",
      module: null,
      mumPlan: 0,
      filmPhase: "idle",
      demoOffsetMs: 0,
      preOffsetMs: 0,
    };
  }

  if (seg.kind === "modulePre") {
    const phase = phaseForPre(offsetMs, enter, copyLen);
    const demoAt = MODULE_LOCK_MS + enter + readMs(copyLen);
    return {
      timeMs: t,
      scene: seg.scene,
      offsetMs,
      kind: "modulePre",
      module: seg.module,
      mumPlan: seg.mumPlan,
      filmPhase: phase,
      demoOffsetMs: phase === "demo" ? Math.max(0, offsetMs - demoAt) : 0,
      preOffsetMs: offsetMs,
    };
  }

  if (seg.kind === "moduleDemo") {
    const demoDur =
      seg.module === "mum"
        ? (DEMO_MS.mumPlans[seg.mumPlan] ?? 2000)
        : seg.module === "clients"
          ? DEMO_MS.clients
          : seg.module === "chantiers"
            ? DEMO_MS.chantiers
            : seg.module === "planning"
              ? DEMO_MS.planning
              : seg.module === "finance"
                ? DEMO_MS.finance
                : DEMO_MS.pilotage;
    const inHold = offsetMs >= demoDur;
    return {
      timeMs: t,
      scene: seg.scene,
      offsetMs,
      kind: "moduleDemo",
      module: seg.module,
      mumPlan: seg.mumPlan,
      filmPhase: inHold ? "hold" : "demo",
      demoOffsetMs: Math.min(offsetMs, demoDur),
      preOffsetMs: 0,
    };
  }

  if (seg.kind === "moduleReturn") {
    return {
      timeMs: t,
      scene: seg.scene,
      offsetMs,
      kind: "moduleReturn",
      module: seg.module,
      mumPlan: 0,
      filmPhase: "returning",
      demoOffsetMs: 0,
      preOffsetMs: 0,
    };
  }

  if (seg.kind === "converge") {
    return {
      timeMs: t,
      scene: 15,
      offsetMs,
      kind: "converge",
      module: null,
      mumPlan: 0,
      filmPhase: "converge",
      demoOffsetMs: 0,
      preOffsetMs: 0,
    };
  }

  return {
    timeMs: t,
    scene: 16,
    offsetMs,
    kind: "signature",
    module: null,
    mumPlan: 0,
    filmPhase: "signature",
    demoOffsetMs: offsetMs,
    preOffsetMs: 0,
  };
}

export function formatFilmTime(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Chapitres affichés sur la barre (ordre réel du film). */
export type HubFilmChapter = {
  id: string;
  label: string;
  startMs: number;
};

function chapterStart(
  predicate: (s: (typeof HUB_TIMELINE_SEGMENTS)[number]) => boolean,
): number {
  const seg = HUB_TIMELINE_SEGMENTS.find(predicate);
  return seg?.start ?? 0;
}

export const HUB_FILM_CHAPTERS: HubFilmChapter[] = [
  { id: "intro", label: "Introduction", startMs: 0 },
  {
    id: "mum",
    label: "MUM IA",
    startMs: chapterStart((s) => s.module === "mum" && s.kind === "modulePre"),
  },
  {
    id: "clients",
    label: "Clients",
    startMs: chapterStart(
      (s) => s.module === "clients" && s.kind === "modulePre",
    ),
  },
  {
    id: "chantiers",
    label: "Chantiers",
    startMs: chapterStart(
      (s) => s.module === "chantiers" && s.kind === "modulePre",
    ),
  },
  {
    id: "planning",
    label: "Planning",
    startMs: chapterStart(
      (s) => s.module === "planning" && s.kind === "modulePre",
    ),
  },
  {
    id: "facturation",
    label: "Facturation",
    startMs: chapterStart(
      (s) => s.module === "finance" && s.kind === "modulePre",
    ),
  },
  {
    id: "pilotage",
    label: "Pilotage",
    startMs: chapterStart(
      (s) => s.module === "pilotage" && s.kind === "modulePre",
    ),
  },
  {
    id: "conclusion",
    label: "Conclusion",
    startMs: chapterStart(
      (s) => s.kind === "converge" || s.kind === "signature",
    ),
  },
];

export function chapterAtTime(ms: number): HubFilmChapter {
  let current = HUB_FILM_CHAPTERS[0];
  for (const ch of HUB_FILM_CHAPTERS) {
    if (ms >= ch.startMs) current = ch;
    else break;
  }
  return current;
}

export function hitSegmentKey(hit: TimelineHit): string {
  return `${hit.kind}|${hit.scene}|${hit.module ?? ""}|${hit.mumPlan}`;
}

export function hitPhaseKey(hit: TimelineHit): string {
  return `${hitSegmentKey(hit)}|${hit.filmPhase}`;
}

export function nextAnchorAfterDemo(
  module: HubFilmModule,
  mumPlan = 0,
): number {
  const idx = HUB_TIMELINE_SEGMENTS.findIndex(
    (s) =>
      s.kind === "moduleDemo" &&
      s.module === module &&
      (module !== "mum" || s.mumPlan === mumPlan),
  );
  if (idx < 0) return 0;
  const seg = HUB_TIMELINE_SEGMENTS[idx];
  return seg.start + seg.duration;
}

export function segmentStartForHit(hit: TimelineHit): number {
  const seg = HUB_TIMELINE_SEGMENTS.find(
    (s) =>
      s.kind === hit.kind &&
      s.scene === hit.scene &&
      s.module === hit.module &&
      s.mumPlan === hit.mumPlan,
  );
  return seg?.start ?? hit.timeMs - hit.offsetMs;
}

/** Durées par chapitre (pour audits). */
export function chapterDurationsMs(): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < HUB_FILM_CHAPTERS.length; i++) {
    const ch = HUB_FILM_CHAPTERS[i];
    const end =
      i + 1 < HUB_FILM_CHAPTERS.length
        ? HUB_FILM_CHAPTERS[i + 1].startMs
        : HUB_FILM_TOTAL_MS;
    out[ch.label] = end - ch.startMs;
  }
  return out;
}

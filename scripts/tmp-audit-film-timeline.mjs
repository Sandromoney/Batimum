/**
 * Audit timeline resolve + clock pause/seek (pure JS mirror of key invariants).
 */

function createFilmClock() {
  let baseElapsed = 0;
  let runningSince = null;
  let jobs = [];
  let nextId = 1;
  let timer = null;
  let playing = false;
  const listeners = new Set();

  const now = () =>
    runningSince == null ? baseElapsed : baseElapsed + (performance.now() - runningSince);

  const emit = () => {
    const t = now();
    listeners.forEach((fn) => fn(t));
  };

  const pump = () => {
    timer = null;
    if (!playing) return;
    const t = now();
    const due = jobs.filter((j) => j.at <= t).sort((a, b) => a.at - b.at);
    if (due.length) {
      const ids = new Set(due.map((j) => j.id));
      jobs = jobs.filter((j) => !ids.has(j.id));
      for (const job of due) job.fn();
    }
    emit();
    timer = setTimeout(pump, 8);
  };

  const ensurePump = () => {
    if (playing && timer == null) timer = setTimeout(pump, 8);
  };

  return {
    now,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    play() {
      if (playing) return;
      playing = true;
      runningSince = performance.now();
      ensurePump();
      emit();
    },
    pause() {
      if (!playing) return;
      baseElapsed = now();
      runningSince = null;
      playing = false;
      if (timer != null) clearTimeout(timer);
      timer = null;
      emit();
    },
    seek(ms) {
      baseElapsed = Math.max(0, ms);
      runningSince = playing ? performance.now() : null;
      jobs = [];
      emit();
      ensurePump();
    },
    later(fn, delayMs) {
      const id = nextId++;
      jobs.push({ id, at: now() + Math.max(0, delayMs), fn });
      ensurePump();
      return id;
    },
    clear(id) {
      if (id == null) jobs = [];
      else jobs = jobs.filter((j) => j.id !== id);
    },
    reset() {
      this.pause();
      baseElapsed = 0;
      jobs = [];
      emit();
    },
  };
}

// Timeline totals — keep in sync with lib/landing-hub-timeline.ts
const MODULE_LOCK_MS = 1180;
const AUTO_BREATH_MS = 620;
const AUTO_PLAN_BREATH_MS = 420;
const HOLD_MS = 500;
const INTRO_MS = 1650;
const readMs = (copyLen) =>
  Math.round(Math.min(2100, Math.max(1650, 1180 + copyLen * 15)));
const modulePreMs = (enterMs, copyLen) =>
  MODULE_LOCK_MS + enterMs + readMs(copyLen);
const DEMO_MS = {
  mumPlans: [9600, 2200, 3400, 1600, 8200, 12800],
  clients: 8400,
  chantiers: 13200,
  planning: 8600,
  finance: 15500,
  pilotage: 6200,
};
const SIG = 1800 + 2000 + 2800 + 3200 + 900 + 2200 + 900 + 800;

function buildTotal() {
  let t = INTRO_MS;
  t += modulePreMs(1380, 56);
  DEMO_MS.mumPlans.forEach((dur, plan) => {
    t +=
      dur +
      HOLD_MS +
      (plan < DEMO_MS.mumPlans.length - 1 ? AUTO_PLAN_BREATH_MS : AUTO_BREATH_MS);
  });
  t += 1700 + AUTO_BREATH_MS;
  const modules = [
    [1380, DEMO_MS.clients, 1700, 62],
    [1380, DEMO_MS.chantiers, 1700, 58],
    [1380, DEMO_MS.planning, 1700, 62],
    [1380, DEMO_MS.finance, 1700, 58],
    [1320, DEMO_MS.pilotage, 1600, 62],
  ];
  for (const [enter, demo, ret, copy] of modules) {
    t += modulePreMs(enter, copy) + demo + HOLD_MS + AUTO_BREATH_MS + ret + AUTO_BREATH_MS;
  }
  t += 1800 + AUTO_BREATH_MS;
  t += SIG + 900;
  return t;
}

function formatFilmTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else console.log("ok:", msg);
}

const TOTAL = buildTotal();
assert(TOTAL > 120_000, `total ${TOTAL} (${formatFilmTime(TOTAL)})`);

const clock = createFilmClock();
let fired = false;
clock.play();
clock.later(() => {
  fired = true;
}, 50);
await new Promise((r) => setTimeout(r, 120));
assert(fired, "later fires while playing");
assert(clock.now() >= 45, `advanced ${Math.round(clock.now())}`);

clock.pause();
const pausedAt = clock.now();
fired = false;
clock.later(() => {
  fired = true;
}, 40);
await new Promise((r) => setTimeout(r, 100));
assert(!fired, "paused blocks later");
assert(Math.abs(clock.now() - pausedAt) < 8, "frozen while paused");

clock.play();
await new Promise((r) => setTimeout(r, 90));
assert(fired, "resume fires pending");

clock.seek(12345);
assert(Math.abs(clock.now() - 12345) < 40, `seek got ${Math.round(clock.now())}`);
fired = false;
clock.later(() => {
  fired = true;
}, 30);
clock.seek(0);
await new Promise((r) => setTimeout(r, 70));
assert(!fired, "seek clears jobs");

console.log("TOTAL", formatFilmTime(TOTAL), TOTAL + "ms");
if (failed) {
  console.error("TIMELINE_AUDIT_FAIL", failed);
  process.exit(1);
}
console.log("TIMELINE_AUDIT_PASS");
clock.pause();
process.exit(0);

/**
 * Audit durée timeline (cible 45s–80s, idéal ~60s).
 */

const MODULE_LOCK_MS = 640;
const AUTO_BREATH_MS = 240;
const AUTO_PLAN_BREATH_MS = 180;
const HOLD_MS = 220;
const INTRO_MS = 700;
const readMs = (copyLen) =>
  Math.round(Math.min(1100, Math.max(750, 520 + copyLen * 8)));
const modulePreMs = (enterMs, copyLen) =>
  MODULE_LOCK_MS + enterMs + readMs(copyLen);

const DEMO_MS = {
  mumPlans: [4000, 1200, 1800, 900, 3600, 5200],
  clients: 3600,
  chantiers: 5000,
  planning: 3800,
  finance: 6000,
  pilotage: 2800,
};
const SIG = 1000 + 1100 + 1500 + 1700 + 500 + 1100 + 500 + 400;

function buildTotal() {
  let t = INTRO_MS;
  t += modulePreMs(680, 56);
  DEMO_MS.mumPlans.forEach((dur, plan) => {
    t +=
      dur +
      HOLD_MS +
      (plan < DEMO_MS.mumPlans.length - 1 ? AUTO_PLAN_BREATH_MS : AUTO_BREATH_MS);
  });
  t += 750 + AUTO_BREATH_MS;
  const modules = [
    [680, DEMO_MS.clients, 750, 62],
    [680, DEMO_MS.chantiers, 750, 58],
    [680, DEMO_MS.planning, 750, 62],
    [680, DEMO_MS.finance, 750, 58],
    [640, DEMO_MS.pilotage, 700, 62],
  ];
  for (const [enter, demo, ret, copy] of modules) {
    t +=
      modulePreMs(enter, copy) +
      demo +
      HOLD_MS +
      AUTO_BREATH_MS +
      ret +
      AUTO_BREATH_MS;
  }
  t += 900 + AUTO_BREATH_MS;
  t += SIG + 300;
  return t;
}

function formatFilmTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const TOTAL = buildTotal();
console.log("TOTAL", formatFilmTime(TOTAL), TOTAL + "ms");
if (TOTAL < 45_000 || TOTAL > 80_000) {
  console.error("DURATION_AUDIT_FAIL", TOTAL);
  process.exit(1);
}
console.log("DURATION_AUDIT_PASS");

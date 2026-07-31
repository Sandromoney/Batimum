/**
 * Audit logique post-hero : 1 geste = 1 slide (simulateur d’inertie).
 */

const ENTRY_CONSUME_MS = 900;
const WHEEL_QUIET_MS = 520;
const STEP_COOLDOWN_MS = 780;
const VISUAL_LOCK_MS = 800;
const WHEEL_THRESHOLD = 52;

function createGate() {
  let step = 0;
  let armed = false;
  let transitioning = false;
  let consumeUntil = 0;
  let lastWheelAt = 0;
  let lastStepAt = 0;
  let accum = 0;
  let now = 0;

  const rearmIfReady = () => {
    if (transitioning) return;
    if (now < consumeUntil) return;
    if (now - lastWheelAt < WHEEL_QUIET_MS) return;
    armed = true;
    accum = 0;
  };

  const onPinEnter = () => {
    lastWheelAt = now;
    armed = false;
    accum = 0;
    consumeUntil = now + ENTRY_CONSUME_MS;
  };

  const onWheel = (deltaY) => {
    lastWheelAt = now;
    if (now < consumeUntil) {
      accum = 0;
      armed = false;
      return null;
    }
    if (transitioning || !armed) {
      accum = 0;
      return null;
    }
    if (now - lastStepAt < STEP_COOLDOWN_MS) {
      accum = 0;
      armed = false;
      return null;
    }
    accum += deltaY;
    if (Math.abs(accum) < WHEEL_THRESHOLD) return null;
    const dir = accum > 0 ? 1 : -1;
    accum = 0;
    armed = false;
    transitioning = true;
    lastStepAt = now;
    step += dir;
    return dir;
  };

  const tick = (ms) => {
    now += ms;
    if (transitioning && now - lastStepAt >= VISUAL_LOCK_MS) {
      transitioning = false;
    }
    rearmIfReady();
  };

  return { onPinEnter, onWheel, tick, getStep: () => step, getArmed: () => armed };
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", msg);
  } else console.log("ok", msg);
}

// Scénario : gros geste Hero → pin → inertie continue
const g = createGate();
g.onPinEnter();
// 40 events d’inertie pendant consume + quiet
for (let i = 0; i < 40; i++) {
  g.onWheel(80);
  g.tick(16);
}
assert(g.getStep() === 0, "inertie entrée ne change pas la slide (reste 0)");

// Attendre silence + consume
g.tick(ENTRY_CONSUME_MS + WHEEL_QUIET_MS + 50);
assert(g.getArmed() === true, "réarmé après silence");

// Un geste volontaire → une seule slide
g.onWheel(60);
assert(g.getStep() === 1, "premier geste → step 1");

// Inertie après le geste
for (let i = 0; i < 30; i++) {
  g.onWheel(90);
  g.tick(16);
}
assert(g.getStep() === 1, "inertie post-geste ne saute pas");

g.tick(VISUAL_LOCK_MS + WHEEL_QUIET_MS + 50);
g.onWheel(60);
assert(g.getStep() === 2, "deuxième geste volontaire → step 2");

if (failed) {
  console.error("PAIN_GESTURE_AUDIT_FAIL", failed);
  process.exit(1);
}
console.log("PAIN_GESTURE_AUDIT_PASS");

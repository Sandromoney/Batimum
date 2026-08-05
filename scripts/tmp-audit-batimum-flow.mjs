import { chromium } from "playwright";

const BASE = process.env.LANDING_URL || "http://127.0.0.1:3140/landing";
const W = 1440;
const H = 900;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function gesture(page) {
  // One intentional gesture after settle — threshold 40, lock ~580ms, quiet 200ms
  await page.mouse.wheel(0, 180);
  await sleep(950);
}

async function dump(page) {
  return page.evaluate(() => {
    const story = document.querySelector(".lp-story");
    const hub = document.querySelector(".lp-hub");
    const texts = [
      ...document.querySelectorAll(
        ".lp-story__copySlot p, .lp-story__headline, .lp-story__micro, .lp-story__lostLead, .lp-story__lostLine, .lp-story__closing",
      ),
    ]
      .filter((el) => {
        const s = getComputedStyle(el);
        return Number(s.opacity) > 0.08 && el.getClientRects().length;
      })
      .map((el) => el.textContent?.replace(/\s+/g, " ").trim());
    const gate = !!document.querySelector(".lp-hub__gate");
    const hint =
      document
        .querySelector(".lp-hub__hint.is-visible .lp-hub__hintText")
        ?.textContent?.trim() || null;
    const scene = hub?.getAttribute("data-hub-scene") || null;
    const phase = story?.getAttribute("data-story-phase") || null;
    const step = story?.getAttribute("data-active-step") || null;
    const mumPlan = document
      .querySelector("[data-mum-plan]")
      ?.getAttribute("data-mum-plan");
    const mumOpen = !!document.querySelector(".lp-hubMum.is-open, .lp-hubMum.is-inside");
    const overlaps = [
      ...document.querySelectorAll(".lp-story__copySlot p"),
    ].filter((el) => Number(getComputedStyle(el).opacity) > 0.08);
    return {
      texts,
      gate,
      hint,
      scene,
      phase,
      step,
      mumPlan,
      mumOpen,
      overlapCount: overlaps.length,
      y: Math.round(window.scrollY),
    };
  });
}

async function advanceUntil(page, predicate, max = 20) {
  for (let i = 0; i < max; i++) {
    const d = await dump(page);
    if (predicate(d)) return d;
    await gesture(page);
  }
  return dump(page);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
  };

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(600);
  await page.evaluate(() => {
    document.getElementById("quotidien")?.scrollIntoView({ block: "start" });
  });
  await sleep(400);
  // Engage pin
  await page.mouse.wheel(0, 60);
  await sleep(500);

  let d = await dump(page);
  check("Pain pin playing", d.phase === "playing", JSON.stringify(d));

  d = await advanceUntil(
    page,
    (x) => (x.texts || []).some((t) => /^Ce temps perdu\.?$/.test(t || "")),
    12,
  );
  const tempsOnly =
    (d.texts || []).some((t) => /^Ce temps perdu\.?$/.test(t || "")) &&
    !(d.texts || []).some((t) => /Tous les jours/.test(t || ""));
  check(
    "Ce temps perdu alone",
    tempsOnly && d.overlapCount <= 1,
    JSON.stringify({ texts: d.texts, step: d.step, overlaps: d.overlapCount }),
  );

  d = await advanceUntil(
    page,
    (x) => (x.texts || []).some((t) => /^Tous les jours\.?$/.test(t || "")),
    4,
  );
  const daysOnly =
    (d.texts || []).some((t) => /^Tous les jours\.?$/.test(t || "")) &&
    !(d.texts || []).some((t) => /Ce temps perdu/.test(t || "")) &&
    !(d.texts || []).some((t) => /ralentir/.test(t || ""));
  check(
    "Tous les jours alone",
    daysOnly && d.overlapCount <= 1,
    JSON.stringify({ texts: d.texts, step: d.step, overlaps: d.overlapCount }),
  );

  d = await advanceUntil(
    page,
    (x) => (x.texts || []).some((t) => /ralentir votre entreprise/i.test(t || "")),
    4,
  );
  const finaleOnly =
    (d.texts || []).some((t) => /ralentir votre entreprise/i.test(t || "")) &&
    !(d.texts || []).some((t) => /Tous les jours/.test(t || ""));
  check(
    "Finale line alone",
    finaleOnly && d.overlapCount <= 1,
    JSON.stringify({ texts: d.texts, step: d.step }),
  );

  // Auto cinematic gate — no extra gesture after finale
  let gated = false;
  for (let i = 0; i < 20; i++) {
    await sleep(400);
    d = await dump(page);
    if (d.gate) {
      gated = true;
      break;
    }
  }
  check("Cinematic auto gate", gated, JSON.stringify({ gate: d.gate, phase: d.phase, step: d.step }));

  if (!gated) {
    await browser.close();
    process.exit(1);
  }

  await page.click(".lp-hub__gateBtn--primary");
  await sleep(900);
  d = await dump(page);
  check("Défilez pour commencer", /commencer/i.test(d.hint || ""), String(d.hint));

  // First tour gesture (engage grace ~280ms already elapsed)
  await page.mouse.wheel(0, 220);
  await sleep(400);
  await page.mouse.wheel(0, 220);
  await sleep(4500);
  d = await dump(page);
  check(
    "First gesture → MUM",
    d.scene === "3" || d.mumOpen,
    JSON.stringify({ scene: d.scene, mumOpen: d.mumOpen, mumPlan: d.mumPlan, hint: d.hint }),
  );

  let unlocked = false;
  for (let i = 0; i < 50; i++) {
    await sleep(1200);
    d = await dump(page);
    if (d.hint && /continuer/i.test(d.hint)) {
      unlocked = true;
      break;
    }
  }
  check(
    "Défilez pour continuer after plan 0",
    unlocked,
    JSON.stringify({ hint: d.hint, mumPlan: d.mumPlan, scene: d.scene }),
  );

  if (unlocked) {
    await gesture(page);
    await sleep(900);
    d = await dump(page);
    check("Advance to MUM plan ≥1", Number(d.mumPlan) >= 1, JSON.stringify(d));
  }

  const photos = await page.evaluate(
    () => document.querySelectorAll(".lp-hubChantier__photos").length,
  );
  check("Chantier photos removed", photos === 0, String(photos));

  const filtered = consoleErrors.filter(
    (e) => !/favicon|Download the React DevTools/i.test(e),
  );
  check("No console errors", filtered.length === 0, filtered.slice(0, 4).join(" | "));

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { chromium } from "playwright";

const BASE = process.env.LANDING_URL || "http://127.0.0.1:3140/landing";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dump(page) {
  return page.evaluate(() => {
    const story = document.querySelector(".lp-story");
    const hub = document.querySelector(".lp-hub");
    const texts = [...document.querySelectorAll(".lp-story__copySlot p")]
      .filter((el) => Number(getComputedStyle(el).opacity) > 0.08)
      .map((el) => el.textContent?.replace(/\s+/g, " ").trim());
    const hint = document.querySelector(".lp-hub__hint.is-visible .lp-hub__hintText")?.textContent;
    const continueHint = hint && /continuer/i.test(hint);
    const gate = !!document.querySelector(".lp-hub__gate");
    const bg = getComputedStyle(document.querySelector(".lp-hub") || document.body).backgroundColor;
    return {
      texts,
      hint: hint || null,
      continueHint: !!continueHint,
      gate,
      scene: hub?.getAttribute("data-hub-scene"),
      phase: story?.getAttribute("data-story-phase"),
      step: story?.getAttribute("data-active-step"),
      experience: hub?.getAttribute("data-hub-experience"),
      film: hub?.getAttribute("data-film-phase"),
      mumPlan: document.querySelector("[data-mum-plan]")?.getAttribute("data-mum-plan"),
      mumOpen: !!document.querySelector(".lp-hubMum.is-open, .lp-hubMum.is-inside"),
      bg,
      done: hub?.getAttribute("data-hub-done"),
    };
  });
}

async function gesture(page) {
  await page.mouse.wheel(0, 180);
  await sleep(950);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok });
    console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
  };

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(500);
  await page.evaluate(() => document.getElementById("quotidien")?.scrollIntoView({ block: "start" }));
  await sleep(400);
  await page.mouse.wheel(0, 60);
  await sleep(500);

  let d = await dump(page);
  check("Pain playing", d.phase === "playing", JSON.stringify(d));

  // Advance to Tout cela…
  for (let i = 0; i < 10; i++) {
    d = await dump(page);
    if ((d.texts || []).some((t) => /Tout cela/i.test(t || ""))) break;
    await gesture(page);
  }
  check("Tout cela alone", (d.texts || []).some((t) => /Tout cela/i.test(t || "")) && !(d.texts || []).some((t) => /ralentir/i.test(t || "")), JSON.stringify(d.texts));

  await gesture(page);
  await sleep(400);
  d = await dump(page);
  check("Finale culminante", (d.texts || []).some((t) => /ralentir votre entreprise/i.test(t || "")), JSON.stringify(d.texts));

  // Wait cinematic handoff → start hint (no gate)
  for (let i = 0; i < 20; i++) {
    await sleep(400);
    d = await dump(page);
    if (d.hint && /commencer/i.test(d.hint) && d.experience === "tour") break;
  }
  check("No gate — only start hint", !d.gate && /commencer/i.test(d.hint || ""), JSON.stringify(d));

  // White-ish hub background
  check("Hub white background", /rgb\(\s*255,\s*255,\s*255\s*\)/.test(d.bg || ""), d.bg);

  // One scroll launches film
  await page.mouse.wheel(0, 220);
  await sleep(400);
  await page.mouse.wheel(0, 220);
  await sleep(4500);
  d = await dump(page);
  check("First scroll → MUM auto", d.scene === "3" || d.mumOpen, JSON.stringify(d));
  check("No continue hint during film", !d.continueHint, String(d.hint));

  // Wait for auto advance to mum plan >= 1 without further gestures
  let advanced = false;
  for (let i = 0; i < 45; i++) {
    await sleep(1500);
    d = await dump(page);
    if (Number(d.mumPlan) >= 1 || Number(d.scene) > 3) {
      advanced = true;
      break;
    }
    if (d.continueHint) break;
  }
  check("Auto-advances without scroll", advanced && !d.continueHint, JSON.stringify({ scene: d.scene, mumPlan: d.mumPlan, hint: d.hint }));

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

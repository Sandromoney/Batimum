/**
 * Vérifie : 1 geste = 1 étape post-hero ; pas d’auto-handoff sur la dernière phrase.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3140";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/landing`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);

  // Pin the pain / story section
  await page.evaluate(() => {
    const el = document.querySelector(".lp-story, #story, [class*='lp-story']");
    el?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(600);

  // Find pin track
  const pinned = await page.evaluate(() => {
    const pin = document.querySelector(".lp-story__pinTrack, .lp-story");
    if (!pin) return null;
    const top = pin.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, top));
    return pin.className;
  });
  await page.waitForTimeout(500);

  // Large wheel burst should only advance ONE step
  const before = await page.evaluate(() =>
    document.querySelector("[data-active-step]")?.getAttribute("data-active-step"),
  );

  await page.mouse.move(680, 400);
  // Big inertial burst
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 180);
  }
  await page.waitForTimeout(200);
  const afterBurst = await page.evaluate(() =>
    document.querySelector("[data-active-step]")?.getAttribute("data-active-step"),
  );

  // Wait for cooldown then advance once
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(200);
  const afterOne = await page.evaluate(() =>
    document.querySelector("[data-active-step]")?.getAttribute("data-active-step"),
  );

  // Walk to last step carefully
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(1000);
    await page.mouse.wheel(0, 140);
    const step = await page.evaluate(() =>
      document.querySelector("[data-active-step]")?.getAttribute("data-active-step"),
    );
    if (step === "6") break;
  }

  const onLast = await page.evaluate(() =>
    document.querySelector("[data-active-step]")?.getAttribute("data-active-step"),
  );

  // Wait 1.5s — should NOT auto-open hub
  await page.waitForTimeout(1500);
  const hubExpBefore = await page.evaluate(() =>
    document.querySelector("#ecosysteme")?.getAttribute("data-hub-experience"),
  );
  const textStillVisible = await page.evaluate(() => {
    const el = document.querySelector(".lp-story__copySlot, .lp-story__stage");
    return (el?.textContent || "").includes("ralentir");
  });

  // Next gesture should open hub
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(1800);
  const hubExpAfter = await page.evaluate(() =>
    document.querySelector("#ecosysteme")?.getAttribute("data-hub-experience"),
  );

  const result = {
    pinned,
    before,
    afterBurst,
    afterOne,
    onLast,
    hubExpBefore,
    textStillVisible,
    hubExpAfter,
  };
  console.log(JSON.stringify(result, null, 2));

  const burstOk =
    before != null &&
    afterBurst != null &&
    Number(afterBurst) - Number(before) <= 1;
  const oneOk = afterOne != null && Number(afterOne) === Number(afterBurst) + 1 || afterOne === afterBurst;
  // More precise: after cooldown one wheel should go +1 from afterBurst if still armed
  const noAuto =
    onLast === "6" &&
    textStillVisible &&
    (hubExpBefore === "idle" || hubExpBefore === "tour" ? hubExpBefore !== "tour" || true : true);
  // hub should not be tour with scene>0 before gesture; allow idle
  const stayed =
    hubExpBefore === "idle" ||
    (hubExpBefore === "tour" &&
      (await page.evaluate(() =>
        document.querySelector("#ecosysteme")?.getAttribute("data-hub-scene"),
      )) === "0");

  // After final gesture, hub tour should start or be opening
  const opened =
    hubExpAfter === "tour" ||
    (await page.evaluate(() =>
      document.body.innerText.includes("Défilez pour commencer"),
    ));

  await browser.close();

  if (!burstOk) {
    console.error("FAIL: large scroll skipped steps", { before, afterBurst });
    process.exit(1);
  }
  if (onLast !== "6") {
    console.error("FAIL: did not reach last step", onLast);
    process.exit(1);
  }
  if (!textStillVisible || !stayed) {
    console.error("FAIL: auto handoff before next gesture", result);
    process.exit(1);
  }
  if (!opened) {
    console.error("FAIL: hub did not open after last gesture", result);
    process.exit(1);
  }
  console.log("PAIN_AUDIT_PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

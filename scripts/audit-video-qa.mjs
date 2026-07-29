/**
 * Video-readiness QA — particles visibility + key UI markers.
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3140";
const OUT = "/opt/cursor/artifacts/screenshots";
mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-web-security"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });

  await page.goto(`${BASE}/landing`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(800);

  // Jump toward Hub — scroll until cream hub sticky/canvas appears
  let found = false;
  for (let i = 0; i < 40; i++) {
    const hit = await page.evaluate(() => {
      const canvas = document.querySelector(".lp-hub__atmosphere:not(.lp-hub__atmosphere--static)");
      const sticky = document.querySelector(".lp-hub__sticky");
      if (!sticky) return { ok: false, reason: "no-sticky" };
      const r = sticky.getBoundingClientRect();
      const inView = r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.25;
      return {
        ok: !!canvas && inView,
        hasCanvas: !!canvas,
        top: Math.round(r.top),
        bg: getComputedStyle(sticky).backgroundColor,
      };
    });
    if (hit.ok) {
      found = true;
      console.log("HUB_IN_VIEW", JSON.stringify(hit));
      break;
    }
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(280);
  }

  if (!found) {
    // Force scroll into hub section by selector
    await page.evaluate(() => {
      const el =
        document.querySelector(".lp-hub") ||
        document.querySelector("[data-hub]") ||
        document.querySelector(".lp-hub__pinTrack");
      el?.scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(1200);
  }

  await page.screenshot({
    path: `${OUT}/hub-atmosphere-full.png`,
    fullPage: false,
  });

  const particleReport = await page.evaluate(() => {
    const canvas = document.querySelector(
      "canvas.lp-hub__atmosphere",
    );
    const staticEl = document.querySelector(".lp-hub__atmosphere--static");
    if (!canvas) {
      return {
        visible: false,
        reason: staticEl ? "static-fallback" : "no-canvas",
        staticPresent: !!staticEl,
      };
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return { visible: false, reason: "no-2d-context" };
    const w = canvas.width;
    const h = canvas.height;
    if (w < 10 || h < 10) return { visible: false, reason: "canvas-too-small", w, h };
    const sample = ctx.getImageData(0, 0, w, h).data;
    let opaque = 0;
    let maxA = 0;
    // Sample every 32th pixel for speed
    for (let i = 3; i < sample.length; i += 32 * 4) {
      const a = sample[i];
      if (a > 8) opaque++;
      if (a > maxA) maxA = a;
    }
    const sticky = document.querySelector(".lp-hub__sticky");
    const cream = sticky
      ? getComputedStyle(sticky).getPropertyValue("--hub-cream") ||
        getComputedStyle(sticky).backgroundColor
      : null;
    return {
      visible: opaque > 40,
      opaqueSamples: opaque,
      maxAlpha: maxA,
      canvasCss: { w: canvas.style.width, h: canvas.style.height },
      buffer: { w, h },
      cream,
      reason: opaque > 40 ? "particles-drawn" : "too-few-opaque-pixels",
    };
  });

  console.log("PARTICLES", JSON.stringify(particleReport, null, 2));

  // Crop hub sticky screenshot if possible
  const stickyBox = await page.locator(".lp-hub__sticky").boundingBox().catch(() => null);
  if (stickyBox) {
    await page.screenshot({
      path: `${OUT}/hub-sticky-particles.png`,
      clip: {
        x: Math.max(0, stickyBox.x),
        y: Math.max(0, stickyBox.y),
        width: Math.min(1440, stickyBox.width),
        height: Math.min(900, stickyBox.height),
      },
    });
  }

  // Advance hub scenes with wheel if pin mode — sample mid-hub content
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(350);
  }
  await page.screenshot({ path: `${OUT}/hub-mid-scenes.png` });

  const markers = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasPlanningWeek: !!document.querySelector(".lp-hubPlan__week"),
      hasTeam: !!document.querySelector(".lp-hubPlan__team"),
      hasPhotoLabels: !!document.querySelector(".lp-hubChantier__photo"),
      hasFilmCursorCss: !!document.querySelector(".lp-hubFilm__cursor, .lp-hubMumSign__cursor"),
      textHasDisponible: text.includes("Disponible"),
      textHasCongé: text.includes("Congé") || text.includes("Congé"),
      textHasArrêt: text.includes("Arrêt maladie"),
      textHasSigner: text.includes("Signer électroniquement") || text.includes("Envoyer au client"),
    };
  });
  console.log("MARKERS", JSON.stringify(markers, null, 2));

  await browser.close();

  if (!particleReport.visible) {
    console.error("FAIL: particles not visibly drawn on canvas");
    process.exit(2);
  }
  console.log("OK: particles visible");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Audit rapide : mécanisme + curseur ciblé + pause lecture.
 * Usage: node scripts/tmp-audit-mechanism-cursor.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3140";
const VIEW = { width: 1366, height: 768 };

function tipOnTarget(cursorBox, targetBox, tipX = 4, tipY = 2) {
  if (!cursorBox || !targetBox) return { ok: false, dx: null, dy: null };
  const tipCx = cursorBox.x + tipX;
  const tipCy = cursorBox.y + tipY;
  const cx = targetBox.x + targetBox.width / 2;
  const cy = targetBox.y + targetBox.height / 2;
  const dx = Math.abs(tipCx - cx);
  const dy = Math.abs(tipCy - cy);
  return { ok: dx <= 10 && dy <= 10, dx, dy, tipCx, tipCy, cx, cy };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEW });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${BASE}/landing`, { waitUntil: "networkidle", timeout: 60000 });

  // Skip to hub: scroll until hub pin / fire open event
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("batimum:open-hub-gate", { detail: { cinematic: true } }),
    );
  });
  await page.waitForTimeout(800);

  const hub = page.locator("#ecosysteme");
  await hub.waitFor({ state: "visible", timeout: 15000 });
  await page.evaluate(() => {
    document.getElementById("ecosysteme")?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(600);

  // Launch film with one wheel
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(500);
  await page.mouse.wheel(0, 120);

  // Wait for MUM highlight / enter
  await page.waitForFunction(
    () => {
      const el = document.querySelector("#ecosysteme");
      return el && ["3", "4"].includes(el.getAttribute("data-hub-scene") || "");
    },
    { timeout: 12000 },
  );

  const sceneAtMum = await page.getAttribute("#ecosysteme", "data-hub-scene");
  const focus = await page.getAttribute("#ecosysteme", "data-focus");
  const phase = await page.getAttribute("#ecosysteme", "data-film-phase");

  // During highlight/enter: cursor should be off
  await page.waitForTimeout(800);
  const cursorOffDuringRead = await page.evaluate(() => {
    const c = document.querySelector(".lp-hubFilm__cursor");
    if (!c) return true;
    return c.classList.contains("is-off") || getComputedStyle(c).opacity === "0";
  });

  // Nuts present, no clock hand
  const nutCount = await page.locator(".lp-hub__chip, .lp-hub__nut").count();
  const hasClockHand = await page.locator(".lp-hub__hand, .lp-hub__clockHand").count();
  const hasIntelHalo = await page.locator(".lp-hub__halo--intel").count();

  // Wait until demo + mic cursor
  await page.waitForFunction(
    () => {
      const el = document.querySelector("#ecosysteme");
      const phase = el?.getAttribute("data-film-phase");
      const c = document.querySelector('.lp-hubMum__ui .lp-hubFilm__cursor.is-on');
      return phase === "demo" && !!c;
    },
    { timeout: 20000 },
  );

  const mic = page.locator('[data-cursor-target="mic"]');
  const cursor = page.locator(".lp-hubMum__ui .lp-hubFilm__cursor.is-on");
  // Laisser la pose snap se stabiliser (pas de trajet animé initial)
  await page.waitForTimeout(120);
  await page.waitForFunction(() => {
    const c = document.querySelector(".lp-hubMum__ui .lp-hubFilm__cursor.is-on");
    const m = document.querySelector('[data-cursor-target="mic"]');
    if (!c || !m) return false;
    const cr = c.getBoundingClientRect();
    const mr = m.getBoundingClientRect();
    const tipX = cr.x + 4;
    const tipY = cr.y + 2;
    const cx = mr.x + mr.width / 2;
    const cy = mr.y + mr.height / 2;
    return Math.abs(tipX - cx) <= 12 && Math.abs(tipY - cy) <= 12;
  }, { timeout: 4000 });
  const micBox = await mic.boundingBox();
  const curBox = await cursor.boundingBox();
  const micHit = tipOnTarget(curBox, micBox);

  // Module order in DOM
  const order = await page.evaluate(() =>
    [...document.querySelectorAll(".lp-hub__mod")].map((el) =>
      [...el.classList].find((c) => c.startsWith("lp-hub__mod--"))?.replace("lp-hub__mod--", ""),
    ),
  );

  // Wait for clients scene eventually (skip long mum via accelerating? — just sample ring rot later)
  // Sample ring positions while still on mum: active module should be near top
  const mumPos = await page.evaluate(() => {
    const mum = document.querySelector(".lp-hub__mod--mum");
    const stage = document.querySelector(".lp-hub__stage");
    if (!mum || !stage) return null;
    const mr = mum.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    return {
      relY: (mr.top + mr.height / 2 - sr.top) / sr.height,
      relX: (mr.left + mr.width / 2 - sr.left) / sr.width,
    };
  });

  console.log(
    JSON.stringify(
      {
        sceneAtMum,
        focus,
        phaseEarly: phase,
        cursorOffDuringRead,
        nutCount,
        hasClockHand,
        hasIntelHalo,
        micHit,
        order,
        mumPos,
        consoleErrors: errors.slice(0, 8),
      },
      null,
      2,
    ),
  );

  const fail =
    !cursorOffDuringRead ||
    nutCount < 6 ||
    hasClockHand > 0 ||
    hasIntelHalo < 1 ||
    !micHit.ok ||
    JSON.stringify(order) !==
      JSON.stringify([
        "mum",
        "clients",
        "chantiers",
        "planning",
        "facturation",
        "pilotage",
      ]);

  await browser.close();
  if (fail) {
    console.error("AUDIT_FAIL");
    process.exit(1);
  }
  console.log("AUDIT_PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

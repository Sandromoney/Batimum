/**
 * Capture each hub film mid-demo (patient waits).
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://127.0.0.1:3140";
const OUT = "/opt/cursor/artifacts/screenshots";
mkdirSync(OUT, { recursive: true });

async function pinHub(page) {
  for (let i = 0; i < 60; i++) {
    const pinned = await page.evaluate(() => {
      const s = document.querySelector(".lp-hub__sticky");
      return s?.classList.contains("is-pinned") ?? false;
    });
    if (pinned) return;
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(200);
  }
}

async function waitForOpen(page, selector, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const open = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return !!(el && el.classList.contains("is-open"));
    }, selector);
    if (open) return true;
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(400);
  }
  return false;
}

async function waitWhileOpen(page, selector, holdMs) {
  const start = Date.now();
  while (Date.now() - start < holdMs) {
    const open = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return !!(el && el.classList.contains("is-open"));
    }, selector);
    if (!open) return false;
    await page.waitForTimeout(500);
  }
  return true;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  await page.goto(`${BASE}/landing`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(800);
  await pinHub(page);

  // MUM
  console.log("waiting mum");
  const mum = await waitForOpen(page, ".lp-hubMum", 90000);
  console.log("mum", mum);
  if (mum) {
    await page.waitForTimeout(5500);
    await page.screenshot({ path: `${OUT}/qa-mum-dictation.png` });
    // hold through part of signature (don't wait full 30s)
    await page.waitForTimeout(18000);
    await page.screenshot({ path: `${OUT}/qa-mum-sign.png` });
    // finish mum by advancing scroll while waiting
    const left = 45000;
    const t0 = Date.now();
    while (Date.now() - t0 < left) {
      const still = await page.evaluate(
        () => document.querySelector(".lp-hubMum")?.classList.contains("is-open"),
      );
      if (!still) break;
      await page.waitForTimeout(1000);
    }
  }

  // Clients
  console.log("waiting clients");
  const clients = await waitForOpen(page, ".lp-hubClients", 60000);
  console.log("clients", clients);
  if (clients) {
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `${OUT}/qa-clients.png` });
    await waitWhileOpen(page, ".lp-hubClients", 12000);
  }

  // Planning
  console.log("waiting plan");
  const plan = await waitForOpen(page, ".lp-hubPlan", 60000);
  console.log("plan", plan);
  if (plan) {
    await page.waitForTimeout(9000);
    await page.screenshot({ path: `${OUT}/qa-planning.png` });
    await page.waitForTimeout(8000);
    await page.screenshot({ path: `${OUT}/qa-planning-conflict.png` });
    await waitWhileOpen(page, ".lp-hubPlan", 25000);
  }

  // Chantiers
  console.log("waiting chantier");
  const chantier = await waitForOpen(page, ".lp-hubChantier", 60000);
  console.log("chantier", chantier);
  if (chantier) {
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${OUT}/qa-chantiers.png` });
  }

  // Finance
  console.log("waiting fin");
  const fin = await waitForOpen(page, ".lp-hubFin", 60000);
  console.log("fin", fin);
  if (fin) {
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${OUT}/qa-finance.png` });
  }

  await browser.close();
  console.log("DONE", { mum, clients, plan, chantier, fin });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

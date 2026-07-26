/**
 * Capture HD des écrans BATIMUM pour le hero marketing (statique).
 * Usage: node scripts/capture-hero-screens.mjs
 */
import { createServer } from "http";
import { spawn } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "landing", "screens");
const BASE = process.env.CAPTURE_BASE || "http://127.0.0.1:3006";

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server not ready: ${url}`);
}

async function main() {
  const { chromium } = await import("playwright");
  await mkdir(outDir, { recursive: true });
  await waitForServer(`${BASE}/landing`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    viewport: { width: 1600, height: 1000 },
  });

  // Desktop dashboard
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/landing/capture/desktop`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.waitForTimeout(1200);
    const el = page.locator("#hero-capture-desktop");
    await el.screenshot({
      path: path.join(outDir, "batimum-desktop-dashboard.png"),
      type: "png",
    });
    await page.close();
    console.log("Wrote batimum-desktop-dashboard.png");
  }

  // Mobile planning
  {
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/landing/capture/mobile`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.waitForTimeout(800);
    const el = page.locator("#hero-capture-mobile");
    await el.screenshot({
      path: path.join(outDir, "batimum-mobile-planning.png"),
      type: "png",
    });
    await page.close();
    console.log("Wrote batimum-mobile-planning.png");
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

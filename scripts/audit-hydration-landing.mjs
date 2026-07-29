/**
 * Capture React hydration errors on /landing.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3140";
const OUT = "/opt/cursor/artifacts/screenshots";
mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const hydration = [];
  const errors = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.includes("hydration") ||
      text.includes("Hydration") ||
      text.includes("did not match") ||
      text.includes("server rendered HTML")
    ) {
      hydration.push(text.slice(0, 500));
    }
    if (msg.type() === "error") errors.push(text.slice(0, 300));
  });
  page.on("pageerror", (err) => errors.push(err.message.slice(0, 300)));

  for (let i = 0; i < 3; i++) {
    await page.goto(`${BASE}/landing`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${OUT}/hydration-landing-${i + 1}.png`,
      fullPage: false,
    });
  }

  // Spot-check nut polygon points are rounded
  const points = await page.evaluate(() => {
    const poly = document.querySelector(".batimumHero__nutSvg polygon");
    return poly?.getAttribute("points") || null;
  });

  const report = { hydration, errors: errors.slice(0, 20), points };
  writeFileSync(`${OUT}/hydration-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close();

  if (hydration.length) {
    console.error("FAIL: hydration errors present");
    process.exit(2);
  }
  if (points && /\d+\.\d{4,}/.test(points)) {
    console.error("FAIL: polygon points still have >3 decimals", points);
    process.exit(3);
  }
  console.log("OK: no hydration mismatch detected");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

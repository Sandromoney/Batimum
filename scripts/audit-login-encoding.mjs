/**
 * Audit post-login: Content-Type / Content-Encoding + dashboard load via tunnel.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const BASE =
  process.env.BASE_URL ||
  "https://learned-spa-pushing-thou.trycloudflare.com";
const EMAIL = process.env.E2E_DIRECTOR_EMAIL || "e2e.audit@batimum.local";
const PASSWORD = process.env.E2E_DIRECTOR_PASSWORD || "E2eAuditBatimum2026!";
const OUT = "/opt/cursor/artifacts/screenshots";
mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const badBodies = [];
  const assetLog = [];

  page.on("response", async (res) => {
    try {
      const url = res.url();
      if (!url.includes(new URL(BASE).host) && !url.startsWith(BASE)) return;
      const ct = res.headers()["content-type"] || "";
      const ce = res.headers()["content-encoding"] || "";
      const status = res.status();
      const isAsset =
        ct.includes("javascript") ||
        ct.includes("text/html") ||
        ct.includes("text/css") ||
        url.includes("/_next/");
      if (!isAsset) return;

      const buf = await res.body().catch(() => null);
      if (!buf) return;
      const head = buf.subarray(0, 4);
      const isGzip = head[0] === 0x1f && head[1] === 0x8b;
      // Playwright usually gives decoded body; if still gzip magic with text type → bug
      const texty =
        ct.includes("javascript") ||
        ct.includes("text/html") ||
        ct.includes("text/css");
      const sample = buf.subarray(0, 80).toString("utf8");
      const looksGarbled =
        texty &&
        (isGzip ||
          /[\u0000-\u0008\u000e-\u001f]/.test(sample) &&
            !sample.includes("<!DOCTYPE") &&
            !sample.includes("function") &&
            !sample.includes("/*!"));

      assetLog.push({
        url: url.replace(BASE, ""),
        status,
        ct,
        ce,
        len: buf.length,
        isGzipMagic: isGzip,
        sample: sample.slice(0, 60),
      });

      if (looksGarbled || (isGzip && !ce)) {
        badBodies.push({
          url,
          status,
          ct,
          ce,
          isGzipMagic: isGzip,
          sample: sample.slice(0, 80),
        });
      }
    } catch {
      /* ignore */
    }
  });

  console.log("goto login", `${BASE}/login`);
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/login-page.png`, fullPage: true });

  // Fill login form — flexible selectors
  const emailSel =
    'input[type="email"], input[name="email"], input#email, input[autocomplete="email"]';
  const passSel =
    'input[type="password"], input[name="password"], input#password';
  await page.waitForSelector(emailSel, { timeout: 30000 });
  await page.fill(emailSel, EMAIL);
  await page.fill(passSel, PASSWORD);

  const submit = page.locator(
    'button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")',
  ).first();
  await submit.click();

  // Wait for navigation away from login or dashboard content
  try {
    await page.waitForURL(
      (url) => !url.pathname.includes("/login"),
      { timeout: 45000 },
    );
  } catch {
    console.log("still on", page.url());
  }

  await page.waitForTimeout(2500);
  const urlAfter = page.url();
  console.log("after login url", urlAfter);

  // If not on dashboard, try going there
  if (!urlAfter.includes("/dashboard")) {
    await page.goto(`${BASE}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(2500);
  }

  await page.screenshot({ path: `${OUT}/dashboard-after-login.png`, fullPage: true });

  const bodyText = await page.evaluate(() => {
    const t = document.body?.innerText || "";
    return {
      title: document.title,
      url: location.href,
      textStart: t.slice(0, 400),
      hasRoot: !!document.querySelector("#__next, main, [data-app], body"),
      scriptCount: document.scripts.length,
      visibleLen: t.replace(/\s+/g, " ").trim().length,
      looksBinaryGarbage:
        (t.match(/[^\x09\x0A\x0D\x20-\x7E\u00C0-\u024F\u0400-\u04FF]/g) || [])
          .length > 40,
    };
  });

  console.log("BODY", JSON.stringify(bodyText, null, 2));
  console.log("BAD_BODIES", JSON.stringify(badBodies.slice(0, 20), null, 2));
  writeFileSync(
    `${OUT}/login-encoding-audit.json`,
    JSON.stringify({ bodyText, badBodies, assetLog: assetLog.slice(0, 80) }, null, 2),
  );

  await browser.close();

  if (badBodies.length) {
    console.error("FAIL: compressed/garbled asset bodies detected");
    process.exit(2);
  }
  if (bodyText.looksBinaryGarbage) {
    console.error("FAIL: dashboard body looks like binary garbage");
    process.exit(3);
  }
  if (bodyText.visibleLen < 20) {
    console.error("FAIL: dashboard nearly empty");
    process.exit(4);
  }
  console.log("OK: login/dashboard assets look healthy");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

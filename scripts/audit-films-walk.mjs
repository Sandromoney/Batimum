/**
 * Deep film walkthrough — advance hub pin scenes and capture each module.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3140";
const OUT = "/opt/cursor/artifacts/screenshots";
mkdirSync(OUT, { recursive: true });

async function scrollToHub(page) {
  for (let i = 0; i < 50; i++) {
    const r = await page.evaluate(() => {
      const sticky = document.querySelector(".lp-hub__sticky");
      if (!sticky) return null;
      const b = sticky.getBoundingClientRect();
      return { top: b.top, pinned: sticky.classList.contains("is-pinned") };
    });
    if (r && r.pinned) return true;
    if (r && r.top < 80 && r.top > -20) return true;
    await page.mouse.wheel(0, 1100);
    await page.waitForTimeout(220);
  }
  return false;
}

async function advancePin(page, steps) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(420);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE_ERR", msg.text());
  });
  page.on("pageerror", (err) => console.log("PAGE_ERR", err.message));

  await page.goto(`${BASE}/landing`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1000);

  const hubOk = await scrollToHub(page);
  console.log("hubReached", hubOk);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/audit-01-hub-ecosystem.png` });

  // Advance through scenes — pin mode uses scroll distance
  // Capture periodically while waiting for films
  const shots = [];
  for (let i = 0; i < 80; i++) {
    await page.mouse.wheel(0, 650);
    await page.waitForTimeout(380);
    const state = await page.evaluate(() => {
      const mum = document.querySelector(".lp-hubMum.is-open, .lp-hubMum.is-inside, .lp-hubMum.is-entering");
      const plan = document.querySelector(".lp-hubPlan.is-open, .lp-hubPlan.is-inside, .lp-hubPlan.is-entering");
      const clients = document.querySelector(".lp-hubClients.is-open, .lp-hubClients.is-inside, .lp-hubClients.is-entering");
      const chantier = document.querySelector(".lp-hubChantier.is-open, .lp-hubChantier.is-inside, .lp-hubChantier.is-entering");
      const fin = document.querySelector(".lp-hubFin.is-open, .lp-hubFin.is-inside, .lp-hubFin.is-entering");
      const canvas = document.querySelector("canvas.lp-hub__atmosphere");
      let particleOk = false;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const d = ctx.getImageData(40, 40, 120, 120).data;
          for (let j = 3; j < d.length; j += 16) if (d[j] > 20) { particleOk = true; break; }
        }
      }
      const text = document.body.innerText;
      return {
        mum: !!mum,
        plan: !!plan,
        clients: !!clients,
        chantier: !!chantier,
        fin: !!fin,
        particleOk,
        hasEmptyPhotoSpans: !!document.querySelector(".lp-hubChantier__photos > span:empty"),
        hasPhotoCards: !!document.querySelector(".lp-hubChantier__photo"),
        hasCongé: text.includes("Congé"),
        hasArrêt: text.includes("Arrêt"),
        hasSigner: text.includes("Signer électroniquement"),
        hasValider: text.includes("Valider"),
        hasDisponible: text.includes("Disponible"),
        hasCommande: text.includes("Commande confirmée"),
        hasFaïencePhoto: text.includes("Faïence"),
      };
    });

    const key = ["mum", "clients", "plan", "chantier", "fin"].find((k) => state[k]);
    if (key && !shots.includes(key)) {
      shots.push(key);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${OUT}/audit-film-${key}.png` });
      console.log("SHOT", key, JSON.stringify(state));
    }
    if (shots.length >= 5) break;
  }

  // Extra wait inside last film for richer UI
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/audit-late.png` });

  const finalState = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      shotsDone: true,
      bodyHasGrayEmptyHint: !!document.querySelector(".lp-hubChantier__photos > span:not([class])"),
      photoCount: document.querySelectorAll(".lp-hubChantier__photo").length,
      weekCols: document.querySelectorAll(".lp-hubPlan__col").length,
      teamMembers: document.querySelectorAll(".lp-hubPlan__team li").length,
      filmCursors: document.querySelectorAll(".lp-hubFilm__cursor, .lp-hubMumSign__cursor").length,
      particleCanvas: !!document.querySelector("canvas.lp-hub__atmosphere"),
      textSnippet: text.slice(0, 200),
    };
  });
  console.log("FINAL", JSON.stringify(finalState, null, 2));
  writeFileSync(`${OUT}/audit-report.json`, JSON.stringify({ shots, finalState }, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

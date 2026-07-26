import fs from "node:fs";

const path = "app/(marketing)/landing/landing-emerald.css";
let s = fs.readFileSync(path, "utf8");
const premium = fs.readFileSync("scripts/hero-premium-css-snippet.css", "utf8");

// 1) Replace split layout block
const splitStart = s.indexOf(".landing-hero--split {");
const splitEndMarker = ".landing-hero__copy {";
const splitEnd = s.indexOf(splitEndMarker, splitStart);
if (splitStart < 0 || splitEnd < 0) {
  console.error("split markers", splitStart, splitEnd);
  process.exit(1);
}

const splitOnly = premium.slice(
  0,
  premium.indexOf(".landing-hero__visual {"),
);
// keep visual rules from premium separately
s = s.slice(0, splitStart) + splitOnly + s.slice(splitEnd);

// Update/insert landing-hero__visual width if present
if (s.includes(".landing-hero__visual {")) {
  s = s.replace(
    /\.landing-hero__visual \{[\s\S]*?\n\}/,
    `.landing-hero__visual {
  position: relative;
  z-index: 1;
  width: 100%;
  min-width: 0;
}`,
  );
}

// 2) Replace 3D scene block from .landing-hero-stage { through prefers-reduced-motion for 3d
const stageStart = s.indexOf("/* ——— Hero 3D device scene");
let stageAlt = s.indexOf(".landing-hero-stage {\n  width: 100%;");
const start = stageStart >= 0 ? stageStart : stageAlt;
if (start < 0) {
  console.error("stage start missing");
  process.exit(1);
}

// Find end: after first prefers-reduced-motion that contains landing-hero-3d__mac OR the premium end
const scenePremium = premium.slice(premium.indexOf("/* ——— Hero 3D premium scene"));
// Find next major section after current stage CSS
const candidates = [
  s.indexOf("/* Hero loop UI */", start),
  s.indexOf(".landing-iphone {", start),
  s.indexOf("/* ——— Hero product", start),
  s.indexOf(".landing-device {", start),
].filter((n) => n > start);
const end = Math.min(...candidates);
if (!Number.isFinite(end)) {
  console.error("stage end missing");
  process.exit(1);
}

s = s.slice(0, start) + scenePremium + "\n\n" + s.slice(end);
fs.writeFileSync(path, s);
console.log("premium css applied", start, end);

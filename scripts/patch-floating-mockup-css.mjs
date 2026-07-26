import fs from "fs";

const path = "app/(marketing)/landing/landing-emerald.css";
let s = fs.readFileSync(path, "utf8");

const start = s.indexOf("/* Mockups — frame on top, no white plate */");
const end = s.indexOf("/* Floats */");
if (start < 0 || end < 0) {
  console.error("markers not found", { start, end });
  process.exit(1);
}

const block = `/* Mockups — chassis PNG only, transparent outside device */
.landing-mockup {
  position: relative;
  width: 100%;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
  filter: none !important;
  -webkit-font-smoothing: antialiased;
}

.landing-mockup__shadow {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: -1%;
  height: 10%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(15, 23, 42, 0.32) 0%,
    rgba(15, 23, 42, 0.1) 42%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
}

.landing-mockup__shadow--laptop {
  left: 8%;
  right: 8%;
  bottom: -2%;
  height: 12%;
}

.landing-mockup__body {
  position: relative;
  z-index: 1;
  width: 100%;
  line-height: 0;
  isolation: isolate;
  transform-style: flat;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
}

.landing-mockup__screen {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  background: #f8fafc;
  line-height: normal;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
  pointer-events: none;
  transform: none !important;
}

.landing-mockup__screen-inner {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}

/* Insets après crop floating (screen-insets.json) */
.landing-mockup__screen--phone {
  top: 1.03%;
  left: 7.58%;
  width: 84.12%;
  height: 95.07%;
  border-radius: 12% / 5.5%;
}

.landing-mockup__screen--laptop {
  top: 0.67%;
  left: 11.66%;
  width: 76.12%;
  height: 82.35%;
  border-radius: 1.2% / 2%;
}

/* Châssis PNG transparent — devant l'écran */
.landing-mockup__frame {
  position: relative;
  z-index: 5;
  display: block;
  width: 100%;
  height: auto;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
  pointer-events: none;
  user-select: none;
}

.landing-mockup--phone .hero-planning {
  height: 100%;
  max-height: 100%;
  min-height: 0;
}

.landing-mockup--laptop .hero-dash {
  position: absolute;
  inset: 0;
  height: 100% !important;
  min-height: 100% !important;
  width: 100%;
  background: #f8fafc;
}

.landing-mockup--laptop .hero-dash__sidebar {
  width: 26%;
  min-width: 0;
  max-width: 180px;
}

.landing-mockup--laptop .hero-dash__sidebar .btp-sidebar {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  display: flex !important;
}

.landing-mockup--laptop .hero-dash__main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.landing-mockup--laptop .hero-dash__chart {
  max-height: none;
  flex: 1;
  min-height: 0;
}

/* Conteneurs scène — aucun plateau blanc */
.landing-hero__visual,
.landing-hero-stage,
.landing-hero-3d,
.landing-hero-3d__scene,
.landing-hero-3d__mac,
.landing-hero-3d__phone,
.landing-hero-mockup-phone,
.landing-hero-mockup-laptop,
.landing-mockup-3d {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

.landing-hero-3d__scene {
  overflow: visible !important;
}

`;

s = s.slice(0, start) + block + s.slice(end);
fs.writeFileSync(path, s);
console.log("patched floating mockup css");

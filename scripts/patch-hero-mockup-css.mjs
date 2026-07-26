import fs from "node:fs";

const path = "app/(marketing)/landing/landing-emerald.css";
const s = fs.readFileSync(path, "utf8");
const start = s.indexOf(".landing-hero-stage__orbit--duo {");
const endMarker = `@media (prefers-reduced-motion: reduce) {
  .landing-hero-stage__phone-hero {
    transform: none !important;
    transition: none !important;
  }

  .landing-hero-float--a,
  .landing-hero-float--b,
  .landing-hero-float--c {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
`;
const end = s.indexOf(endMarker, start);
if (start < 0 || end < 0) {
  console.error("markers", start, end);
  process.exit(1);
}

const replacement = fs.readFileSync(
  "scripts/hero-mockup-css-snippet.css",
  "utf8",
);
const out = s.slice(0, start) + replacement + s.slice(end + endMarker.length);
fs.writeFileSync(path, out);
console.log("patched ok", out.length - s.length);

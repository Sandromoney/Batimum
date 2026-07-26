import fs from "node:fs";

const path = "app/(marketing)/landing/landing-emerald.css";
const s = fs.readFileSync(path, "utf8");
const start = s.indexOf(".landing-hero-stage {\n  width: 100%;");
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

// Prefer matching the section that starts at landing-hero-stage and ends before next major block
// After previous edits, reduced-motion block may still reference phone-hero
let end = s.indexOf(endMarker, start);
if (end < 0) {
  // Fallback: find prefers-reduced-motion that mentions landing-hero-float--a after start
  const alt = s.indexOf(
    ".landing-hero-float--a,\n  .landing-hero-float--b,\n  .landing-hero-float--c {",
    start,
  );
  if (alt < 0) {
    console.error("end not found", start);
    process.exit(1);
  }
  end = s.indexOf("}\n", s.indexOf("}", alt) + 1) + 2;
  // find closing of media query
  const mediaStart = s.lastIndexOf("@media (prefers-reduced-motion: reduce)", alt);
  end = s.indexOf("\n}", s.indexOf("{", mediaStart)) + 2;
  // better: find matching brace
  let i = s.indexOf("{", mediaStart);
  let depth = 0;
  for (; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        if (s[end] === "\n") end++;
        break;
      }
    }
  }
}

if (start < 0 || end < 0) {
  console.error("markers", start, end);
  process.exit(1);
}

const snippet = fs.readFileSync("scripts/hero-3d-css-snippet.css", "utf8");
const out = s.slice(0, start) + snippet + "\n" + s.slice(end);
fs.writeFileSync(path, out);
console.log("patched", start, "->", end, "delta", out.length - s.length);

import fs from "node:fs";

const path = "app/(marketing)/landing/landing-emerald.css";
let s = fs.readFileSync(path, "utf8");

if (!s.includes("hero-planning__section--next")) {
  s = s.replace(
    `.hero-planning__section {
  display: grid;
  gap: 0.45rem;
}`,
    `.hero-planning__section {
  display: grid;
  gap: 0.45rem;
}

.hero-planning__section--next {
  opacity: 0.92;
}`,
  );
}

const junkStart = s.indexOf(
  `@media (prefers-reduced-motion: reduce) {
  .landing-hero-stage__phone-hero {`,
);
if (junkStart >= 0) {
  let i = s.indexOf("{", junkStart);
  let depth = 0;
  for (; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) {
        i += 1;
        if (s[i] === "\n") i += 1;
        s = s.slice(0, junkStart) + s.slice(i);
        break;
      }
    }
  }
}

fs.writeFileSync(path, s);
console.log("ok");

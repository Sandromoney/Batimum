import sharp from "sharp";

const { data, info } = await sharp(
  "C:/Users/kyy/AppData/Local/Temp/cursor/screenshots/landing-final-check.png",
)
  .raw()
  .ensureAlpha()
  .toBuffer({ resolveWithObject: true });

console.log("size", info.width, info.height);

// Find elongated dark horizontal cluster = Dynamic Island
const dark = [];
for (let y = 100; y < 280; y++) {
  for (let x = 80; x < 420; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i] < 55 && data[i + 1] < 55 && data[i + 2] < 55) {
      dark.push({ x, y });
    }
  }
}
console.log("dark count", dark.length);
if (dark.length) {
  const xs = dark.map((p) => p.x);
  const ys = dark.map((p) => p.y);
  console.log("dark bbox", {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  });
}

// Mac black bar rows
for (let y = 250; y < 520; y += 10) {
  let b = 0;
  for (let x = 420; x < 900; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i] + data[i + 1] + data[i + 2] < 50) b++;
  }
  if (b > 40) console.log("mac black row", y, b);
}

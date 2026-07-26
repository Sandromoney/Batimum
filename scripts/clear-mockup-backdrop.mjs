/**
 * Remove solid white backdrop around devices (keeps chassis).
 * Flood-fill from corners: near-white connected components → transparent.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("public/landing/mockups");

function isBg(r, g, b, a) {
  if (a < 8) return true;
  return r >= 248 && g >= 248 && b >= 248;
}

async function clearBackdrop(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  const seen = new Uint8Array(width * height);
  const stack = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (seen[i]) return;
    const p = i * channels;
    if (!isBg(out[p], out[p + 1], out[p + 2], out[p + 3])) return;
    seen[i] = 1;
    stack.push(i);
  };

  // seeds: borders
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  let cleared = 0;
  while (stack.length) {
    const i = stack.pop();
    const p = i * channels;
    out[p + 3] = 0;
    cleared++;
    const x = i % width;
    const y = (i / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  await sharp(out, { raw: { width, height, channels } }).png().toFile(file);
  console.log(path.basename(file), "cleared", cleared);
}

async function main() {
  for (const name of ["iphone-pro-mockup.png", "macbook-pro-mockup.png"]) {
    const dest = path.join(ROOT, name);
    const bak = path.join(ROOT, name.replace(".png", ".original.png"));
    if (fs.existsSync(bak)) {
      // start from punched original then clear bg: re-punch first via existing script? 
      // Use current punched file which already has screen hole
      await clearBackdrop(dest);
    } else {
      await clearBackdrop(dest);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

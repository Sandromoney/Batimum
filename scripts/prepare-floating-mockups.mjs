/**
 * Crop mockups to opaque device bounds + recompute screen insets.
 * Starts from .original.png, punches screen, clears backdrop, then crops.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// reuse punch by shelling logic inline

const ROOT = path.resolve("public/landing/mockups");

function isNearBlack(r, g, b, max = 40) {
  return r <= max && g <= max && b <= max;
}
function isNearWhite(r, g, b, min = 248) {
  return r >= min && g >= min && b >= min;
}
function roundedRectContains(x, y, left, top, right, bottom, rx, ry) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const w = right - left;
  const h = bottom - top;
  const crx = Math.min(rx, w / 2);
  const cry = Math.min(ry, h / 2);
  if (x >= left + crx && x <= right - crx) return true;
  if (y >= top + cry && y <= bottom - cry) return true;
  const corners = [
    [left + crx, top + cry],
    [right - crx, top + cry],
    [left + crx, bottom - cry],
    [right - crx, bottom - cry],
  ];
  for (const [cx, cy] of corners) {
    const dx = (x - cx) / crx;
    const dy = (y - cy) / cry;
    if (dx * dx + dy * dy <= 1) return true;
  }
  return false;
}
function inDynamicIsland(x, y, left, top, right, bottom, width) {
  const screenW = right - left;
  const screenH = bottom - top;
  const islandW = screenW * 0.34;
  const islandH = Math.max(screenH * 0.028, width * 0.035);
  const cx = (left + right) / 2;
  const cy = top + screenH * 0.028 + islandH / 2;
  const dx = (x - cx) / (islandW / 2);
  const dy = (y - cy) / (islandH / 2);
  return dx * dx + dy * dy <= 1;
}

async function processDevice({
  original,
  dest,
  kind,
}) {
  // 1) load original
  let { data, info } = await sharp(original)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let { width, height, channels } = info;
  let out = Buffer.from(data);

  // 2) find screen black bounds
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;
  const yLimit = kind === "laptop" ? Math.floor(height * 0.82) : height;
  for (let y = 0; y < yLimit; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = out[i],
        g = out[i + 1],
        b = out[i + 2],
        a = out[i + 3];
      if (a < 200 || isNearWhite(r, g, b)) continue;
      if (!isNearBlack(r, g, b, kind === "laptop" ? 35 : 40)) continue;
      if (kind === "phone" && y / height > 0.92 && (x / width < 0.15 || x / width > 0.85))
        continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const left = minX + 1;
  const top = minY + 1;
  const right = maxX - 1;
  const bottom = maxY - 1;
  const screenW = right - left;
  const screenH = bottom - top;
  const rx = kind === "phone" ? screenW * 0.12 : screenW * 0.012;
  const ry = kind === "phone" ? screenH * 0.055 : screenH * 0.02;

  // 3) punch screen
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (!roundedRectContains(x, y, left, top, right, bottom, rx, ry)) continue;
      if (kind === "phone" && inDynamicIsland(x, y, left, top, right, bottom, width))
        continue;
      const i = (y * width + x) * channels;
      if (!isNearBlack(out[i], out[i + 1], out[i + 2], 45)) continue;
      out[i + 3] = 0;
    }
  }

  // 4) clear white backdrop via flood from borders
  const seen = new Uint8Array(width * height);
  const stack = [];
  const isBg = (r, g, b, a) => a < 8 || (r >= 248 && g >= 248 && b >= 248);
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx]) return;
    const p = idx * channels;
    if (!isBg(out[p], out[p + 1], out[p + 2], out[p + 3])) return;
    seen[idx] = 1;
    stack.push(idx);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const idx = stack.pop();
    out[idx * channels + 3] = 0;
    const x = idx % width;
    const y = (idx / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // 5) opaque device bbox (any alpha > 10)
  let dMinX = width,
    dMinY = height,
    dMaxX = 0,
    dMaxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = out[(y * width + x) * channels + 3];
      if (a <= 10) continue;
      dMinX = Math.min(dMinX, x);
      dMinY = Math.min(dMinY, y);
      dMaxX = Math.max(dMaxX, x);
      dMaxY = Math.max(dMaxY, y);
    }
  }
  // pad 2px
  dMinX = Math.max(0, dMinX - 2);
  dMinY = Math.max(0, dMinY - 2);
  dMaxX = Math.min(width - 1, dMaxX + 2);
  dMaxY = Math.min(height - 1, dMaxY + 2);
  const cropW = dMaxX - dMinX + 1;
  const cropH = dMaxY - dMinY + 1;

  await sharp(out, { raw: { width, height, channels } })
    .extract({ left: dMinX, top: dMinY, width: cropW, height: cropH })
    .png()
    .toFile(dest);

  // screen insets relative to cropped image
  const screen = {
    top: (((top - dMinY) / cropH) * 100).toFixed(3),
    left: (((left - dMinX) / cropW) * 100).toFixed(3),
    width: ((screenW / cropW) * 100).toFixed(3),
    height: ((screenH / cropH) * 100).toFixed(3),
    radiusX: ((rx / screenW) * 100).toFixed(2),
    radiusY: ((ry / screenH) * 100).toFixed(2),
  };

  return { kind, width: cropW, height: cropH, screen };
}

async function main() {
  const phone = await processDevice({
    original: path.join(ROOT, "iphone-pro-mockup.original.png"),
    dest: path.join(ROOT, "iphone-pro-mockup.png"),
    kind: "phone",
  });
  const laptop = await processDevice({
    original: path.join(ROOT, "macbook-pro-mockup.original.png"),
    dest: path.join(ROOT, "macbook-pro-mockup.png"),
    kind: "laptop",
  });
  const meta = { phone, laptop };
  fs.writeFileSync(
    path.join(ROOT, "screen-insets.json"),
    JSON.stringify(meta, null, 2),
  );
  console.log(JSON.stringify(meta, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

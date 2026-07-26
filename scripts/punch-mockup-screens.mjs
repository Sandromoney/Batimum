/**
 * Punch black screen regions to transparent in existing mockup PNGs.
 * Keeps chassis, Dynamic Island, bezels intact for frame-on-top layering.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("public/landing/mockups");

function isNearBlack(r, g, b, max = 28) {
  return r <= max && g <= max && b <= max;
}

function isNearWhite(r, g, b, min = 245) {
  return r >= min && g >= min && b >= min;
}

/**
 * Find bounding box of contiguous dark pixels that form the display glass.
 */
function findScreenBounds(data, width, height, channels) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels === 4 ? data[i + 3] : 255;
      if (a < 200) continue;
      if (isNearWhite(r, g, b)) continue;
      if (!isNearBlack(r, g, b, 40)) continue;
      // Ignore soft drop-shadow under device (far from center)
      const cx = x / width;
      const cy = y / height;
      if (cy > 0.92 && (cx < 0.15 || cx > 0.85)) continue;
      count++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (count < 1000) {
    throw new Error("Could not detect screen black region");
  }

  return { minX, minY, maxX, maxY, count };
}

function roundedRectContains(x, y, left, top, right, bottom, rx, ry) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const w = right - left;
  const h = bottom - top;
  const crx = Math.min(rx, w / 2);
  const cry = Math.min(ry, h / 2);

  // Interior (excluding corner squares)
  if (x >= left + crx && x <= right - crx) return true;
  if (y >= top + cry && y <= bottom - cry) return true;

  // Corner ellipses
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

/** Dynamic Island oval — keep opaque on frame */
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

async function punchPhone(src, dest) {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const bounds = findScreenBounds(data, width, height, channels);

  // Tighten: only the glass, not outer black bezel fringe — inset 1px
  const left = bounds.minX + 1;
  const top = bounds.minY + 1;
  const right = bounds.maxX - 1;
  const bottom = bounds.maxY - 1;
  const screenW = right - left;
  const screenH = bottom - top;
  // iPhone Pro corner radius ~ relative to short side
  const rx = screenW * 0.12;
  const ry = screenH * 0.055;

  const out = Buffer.from(data);
  let punched = 0;

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (!roundedRectContains(x, y, left, top, right, bottom, rx, ry)) continue;
      if (inDynamicIsland(x, y, left, top, right, bottom, width)) continue;

      const i = (y * width + x) * channels;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      // Only punch near-black pixels (preserve highlights/reflections on glass edge)
      if (!isNearBlack(r, g, b, 45)) continue;
      out[i + 3] = 0;
      punched++;
    }
  }

  await sharp(out, { raw: { width, height, channels } }).png().toFile(dest);

  return {
    device: "iphone",
    width,
    height,
    bounds: { left, top, right, bottom },
    insetsPct: {
      top: ((top / height) * 100).toFixed(2),
      left: ((left / width) * 100).toFixed(2),
      right: (((width - 1 - right) / width) * 100).toFixed(2),
      bottom: (((height - 1 - bottom) / height) * 100).toFixed(2),
      radiusX: ((rx / screenW) * 100).toFixed(2),
      radiusY: ((ry / screenH) * 100).toFixed(2),
    },
    punched,
  };
}

async function punchLaptop(src, dest) {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Laptop screen is the upper black panel — restrict search above keyboard deck
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  const yLimit = Math.floor(height * 0.82);

  for (let y = 0; y < yLimit; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels === 4 ? data[i + 3] : 255;
      if (a < 200) continue;
      if (isNearWhite(r, g, b)) continue;
      if (!isNearBlack(r, g, b, 35)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX <= minX) throw new Error("Laptop screen not found");

  const left = minX + 1;
  const top = minY + 1;
  const right = maxX - 1;
  const bottom = maxY - 1;
  const screenW = right - left;
  const screenH = bottom - top;
  const rx = screenW * 0.012;
  const ry = screenH * 0.02;

  const out = Buffer.from(data);
  let punched = 0;

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (!roundedRectContains(x, y, left, top, right, bottom, rx, ry)) continue;
      const i = (y * width + x) * channels;
      if (!isNearBlack(out[i], out[i + 1], out[i + 2], 40)) continue;
      out[i + 3] = 0;
      punched++;
    }
  }

  await sharp(out, { raw: { width, height, channels } }).png().toFile(dest);

  return {
    device: "macbook",
    width,
    height,
    bounds: { left, top, right, bottom },
    insetsPct: {
      top: ((top / height) * 100).toFixed(2),
      left: ((left / width) * 100).toFixed(2),
      right: (((width - 1 - right) / width) * 100).toFixed(2),
      bottom: (((height - 1 - bottom) / height) * 100).toFixed(2),
      radiusX: ((rx / screenW) * 100).toFixed(2),
      radiusY: ((ry / screenH) * 100).toFixed(2),
    },
    punched,
  };
}

async function main() {
  const phoneSrc = path.join(ROOT, "iphone-pro-mockup.png");
  const laptopSrc = path.join(ROOT, "macbook-pro-mockup.png");

  // Backup originals once
  const phoneBak = path.join(ROOT, "iphone-pro-mockup.original.png");
  const laptopBak = path.join(ROOT, "macbook-pro-mockup.original.png");
  if (!fs.existsSync(phoneBak)) fs.copyFileSync(phoneSrc, phoneBak);
  if (!fs.existsSync(laptopBak)) fs.copyFileSync(laptopSrc, laptopBak);

  // Punch from originals so re-runs are safe
  const phoneMeta = await punchPhone(phoneBak, phoneSrc);
  const laptopMeta = await punchLaptop(laptopBak, laptopSrc);

  const metaPath = path.join(ROOT, "screen-insets.json");
  fs.writeFileSync(
    metaPath,
    JSON.stringify({ phone: phoneMeta, laptop: laptopMeta }, null, 2),
  );
  console.log(JSON.stringify({ phone: phoneMeta, laptop: laptopMeta }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

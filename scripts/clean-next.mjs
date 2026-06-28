import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const dir of [".next", path.join("node_modules", ".cache")]) {
  const target = path.join(root, dir);
  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Removed ${dir}`);
  } catch {
    console.log(`Skip ${dir}`);
  }
}

import { requestOverpassViaHttps } from "../lib/maps/overpass-http.ts";

const BBOX = "43.75,1.8,44.05,2.45";

async function test(label, filter) {
  const q = `[out:json][timeout:25];nwr(${BBOX})${filter};out center 20 tags;`;
  const body = `data=${encodeURIComponent(q)}`;
  const { status, text } = await requestOverpassViaHttps(
    "https://overpass-api.de/api/interpreter",
    body,
    25000,
    "Batimum/1.0",
  );
  console.log("\n", label, "status", status);
  try {
    const data = JSON.parse(text);
    console.log("count", data.elements?.length);
    console.log(data.elements?.slice(0, 3).map((e) => e.tags?.name ?? e.tags?.brand));
  } catch {
    console.log(text.slice(0, 100));
  }
}

await test('operator CEDEO', '["operator"~"CEDEO",i]');
await test('shop trade brand CEDEO', '["shop"="trade_supplies"]["brand"~"CEDEO",i]');
await test('name exact CEDEO', '["name"="CEDEO"]');

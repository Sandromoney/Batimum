/**
 * Tests validation inscription + autocomplete adresse.
 * Usage: node scripts/test-signup-validation.mjs
 */
const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3006";

const results = [];
function log(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function validateEmail(email) {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    String(email).trim(),
  );
}
function validatePostalCode(v) {
  return /^\d{5}$/.test(String(v).trim());
}
function validateSiret(v) {
  if (!v) return true;
  return /^\d{14}$/.test(String(v).replace(/\s/g, ""));
}
function validateFrenchTva(v) {
  if (!v) return true;
  return /^FR[A-Z0-9]{2}\d{9}$/.test(String(v).replace(/\s/g, "").toUpperCase());
}
function validatePhone(phone) {
  const digits = String(phone).replace(/\s/g, "");
  const french = digits.startsWith("+33")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  return /^[1-9]\d{8}$/.test(french);
}

async function main() {
  log("Email valide", validateEmail("prosandro@batimum.fr"));
  log("Email invalide (seul @)", !validateEmail("a@"));
  log("Email invalide (pas de domaine)", !validateEmail("a@b"));
  log("CP 81000", validatePostalCode("81000"));
  log("CP invalide lettres", !validatePostalCode("81A00"));
  log("CP invalide longueur", !validatePostalCode("8100"));
  log("SIRET 14 chiffres", validateSiret("12345678901234"));
  log("SIRET invalide", !validateSiret("123"));
  log("TVA FR ok", validateFrenchTva("FR12345678901"));
  log("TVA invalide", !validateFrenchTva("FR12"));
  log("Téléphone FR", validatePhone("06 12 34 56 78"));
  log("Téléphone invalide", !validatePhone("abcd"));

  const pages = [
    "/login",
    "/signup",
    "/login-employe",
    "/configurer-entreprise",
    "/inscription/documents",
    "/inscription/bancaire",
  ];
  for (const path of pages) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    log(`Page ${path}`, res.status === 200 || res.status === 307, `status=${res.status}`);
  }

  const addr = await fetch(
    `${BASE}/api/maps/address-autocomplete?q=${encodeURIComponent("18 Chemin Albi")}`,
  );
  const body = await addr.json();
  log(
    "Autocomplete adresse",
    addr.status === 200 &&
      body.ok === true &&
      Array.isArray(body.suggestions) &&
      body.suggestions.length > 0,
    `${body.suggestions?.length ?? 0} suggestions`,
  );
  if (body.suggestions?.[0]) {
    const s = body.suggestions[0];
    log(
      "Suggestion complète",
      Boolean(s.adresse && s.codePostal && s.ville && s.pays),
      s.label,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} tests OK`);
  if (failed.length) {
    for (const item of failed) console.log(`  FAIL: ${item.name} — ${item.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

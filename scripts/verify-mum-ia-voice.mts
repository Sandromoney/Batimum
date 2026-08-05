/**
 * Vérifie le nettoyage BTP des transcriptions vocales MUM IA.
 * Usage: node --experimental-strip-types scripts/verify-mum-ia-voice.mts
 */

import { cleanupBtpTranscript } from "../lib/mum-ia/btp-transcript-cleanup.ts";
import {
  MUM_IA_VOICE_ALLOWED_MIME_PREFIXES,
  MUM_IA_VOICE_MAX_DURATION_SEC,
} from "../lib/mum-ia/voice-dictation-constants.ts";

let failed = 0;

function assert(condition: boolean, label: string) {
  if (!condition) {
    failed += 1;
    console.error("FAIL:", label, condition);
  } else {
    console.log("OK:", label);
  }
}

const t1 = cleanupBtpTranscript("dix huit mètres carré de faïence");
assert(t1.includes("18 m²"), `dix huit mètres carré → 18 m² (got: ${t1})`);

const t2 = cleanupBtpTranscript("douche cent vingt par quatre-vingt-dix");
assert(
  t2.includes("120 × 90"),
  `cent vingt par quatre-vingt-dix → 120 × 90 (got: ${t2})`,
);

const t3 = cleanupBtpTranscript("pose de be a 13 et plako");
assert(/BA13/i.test(t3), `be a 13 → BA13 (got: ${t3})`);
assert(/placo/i.test(t3), `plako → placo (got: ${t3})`);

const t4 = cleanupBtpTranscript("réseau p e r et multi couche");
assert(/\bPER\b/.test(t4), `p e r → PER (got: ${t4})`);
assert(/multicouche/i.test(t4), `multi couche → multicouche (got: ${t4})`);

assert(MUM_IA_VOICE_MAX_DURATION_SEC === 240, "durée max 4 min");
assert(
  MUM_IA_VOICE_ALLOWED_MIME_PREFIXES.includes("audio/webm"),
  "mime webm autorisé",
);
assert(
  MUM_IA_VOICE_ALLOWED_MIME_PREFIXES.includes("audio/mp4"),
  "mime mp4 autorisé",
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) échouée(s)`);
  process.exit(1);
}

console.log("\nverify-mum-ia-voice: OK");

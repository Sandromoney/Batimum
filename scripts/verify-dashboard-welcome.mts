/**
 * Tests d'accueil dashboard (sans framework).
 * Usage : node --experimental-strip-types scripts/verify-dashboard-welcome.mts
 */
import {
  DASHBOARD_GENERIC_WELCOME_PHRASES,
  formatDashboardWelcomeTitle,
  getDashboardGreetingHour,
  looksLikeTechnicalDisplayName,
  resolveDashboardWelcomeName,
  resolveDashboardWelcomeSubtitle,
} from "../lib/dashboard-welcome-core.ts";

let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    failed += 1;
    console.error(`  FAIL ${label}`);
  }
}

function atHour(hour: number) {
  return new Date(2026, 7, 5, hour, 0, 0);
}

console.log("1. Salutation horaire");
assert(getDashboardGreetingHour(atHour(5)) === "Bonjour", "05h → Bonjour");
assert(getDashboardGreetingHour(atHour(12)) === "Bonjour", "12h → Bonjour");
assert(getDashboardGreetingHour(atHour(17)) === "Bonjour", "17h → Bonjour");
assert(getDashboardGreetingHour(atHour(18)) === "Bonsoir", "18h → Bonsoir");
assert(getDashboardGreetingHour(atHour(23)) === "Bonsoir", "23h → Bonsoir");
assert(getDashboardGreetingHour(atHour(0)) === "Bonsoir", "00h → Bonsoir");
assert(getDashboardGreetingHour(atHour(4)) === "Bonsoir", "04h → Bonsoir");

console.log("\n2. Nom affiché");
assert(
  resolveDashboardWelcomeName({ prenom: "Anthony", utilisateur: "prosandro83" }) ===
    "Anthony",
  "priorité prénom",
);
assert(
  resolveDashboardWelcomeName({
    utilisateur: "Jean Dupont",
    entreprise: "Batimum SARL",
  }) === "Jean",
  "nom d'affichage",
);
assert(
  resolveDashboardWelcomeName({
    utilisateur: "prosandro83",
    entreprise: "Batimum SARL",
  }) === "Batimum SARL",
  "évite pseudo technique",
);
assert(
  resolveDashboardWelcomeName({ utilisateur: "prosandro83" }) === "",
  "pas de pseudo seul",
);
assert(resolveDashboardWelcomeName({}) === "", "sans profil → vide");
assert(
  formatDashboardWelcomeTitle("Bonjour", "") === "Bonjour",
  "titre sans nom",
);
assert(
  formatDashboardWelcomeTitle("Bonsoir", "Anthony") === "Bonsoir Anthony",
  "titre avec nom",
);
assert(looksLikeTechnicalDisplayName("prosandro83"), "détecte pseudo");
assert(!looksLikeTechnicalDisplayName("Anthony"), "prénom OK");

console.log("\n3. Messages contextuels");
assert(
  resolveDashboardWelcomeSubtitle({
    interventionsToday: 3,
    devisEnAttente: 2,
    chantiersEnRetard: 1,
    onboardingStepsRemaining: 2,
  }) === "3 interventions sont prévues aujourd'hui.",
  "interventions prioritaires",
);
assert(
  resolveDashboardWelcomeSubtitle({
    interventionsToday: 0,
    devisEnAttente: 2,
    chantiersEnRetard: 1,
    onboardingStepsRemaining: 0,
  }) === "2 devis attendent encore une action.",
  "devis en attente",
);
assert(
  resolveDashboardWelcomeSubtitle({
    interventionsToday: 0,
    devisEnAttente: 0,
    chantiersEnRetard: 1,
    onboardingStepsRemaining: 0,
  }) === "Un chantier mérite votre attention aujourd'hui.",
  "chantier en retard",
);
assert(
  resolveDashboardWelcomeSubtitle({
    interventionsToday: 0,
    devisEnAttente: 0,
    chantiersEnRetard: 0,
    onboardingStepsRemaining: 2,
  }) === "Quelques réglages suffisent encore pour profiter de tout Batimum.",
  "onboarding restant",
);
{
  const generic = resolveDashboardWelcomeSubtitle({
    interventionsToday: 0,
    devisEnAttente: 0,
    chantiersEnRetard: 0,
    onboardingStepsRemaining: 0,
    referenceDate: atHour(10),
  });
  assert(
    (DASHBOARD_GENERIC_WELCOME_PHRASES as readonly string[]).includes(generic),
    "phrase générique du catalogue",
  );
}

console.log("\n4. Catalogue générique");
assert(DASHBOARD_GENERIC_WELCOME_PHRASES.length >= 8, "assez de phrases");
assert(
  DASHBOARD_GENERIC_WELCOME_PHRASES.every((p) => !/[👋😀🎉]/.test(p)),
  "pas d'emoji dans les phrases",
);

if (failed > 0) {
  console.error(`\n${failed} échec(s)`);
  process.exit(1);
}
console.log("\nTous les tests sont passés.");

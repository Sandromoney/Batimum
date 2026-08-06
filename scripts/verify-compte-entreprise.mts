/**
 * Vérifications ciblées : SIRET helpers, types client, numérotation, isolation companyId.
 * Usage : node --experimental-strip-types scripts/verify-compte-entreprise.mts
 */
import {
  formatNumeroExample,
  freshCompanyParametres,
  generateNextNumeroDevis,
  generateNextNumeroFacture,
  normalizeLongueurCompteur,
  normalizeSeparateurNumero,
  DEFAULT_PREFIXE_DEVIS,
  DEFAULT_PREFIXE_FACTURE,
  DEFAULT_SEPARATEUR_NUMERO,
  DEFAULT_LONGUEUR_COMPTEUR,
} from "../lib/parametres.ts";
import {
  getTypeClientLabel,
  isClientOrganisation,
  normalizeTypeClient,
} from "../lib/clients.ts";
import { getCompanyIdForUser } from "../lib/supabase-auth-server.ts";
import { emptyAppData } from "../lib/app-data-empty.ts";

let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${label}`);
  }
}

console.log("1. Types client");
assert(normalizeTypeClient("particulier") === "particulier", "particulier");
assert(normalizeTypeClient("professionnel") === "professionnel", "professionnel");
assert(
  normalizeTypeClient("entite_publique") === "entite_publique",
  "entite_publique",
);
assert(normalizeTypeClient("autre") === "particulier", "fallback particulier");
assert(
  getTypeClientLabel("entite_publique") === "Entité publique",
  "label entité publique",
);
assert(
  isClientOrganisation({ typeClient: "entite_publique" }) === true,
  "entité = organisation",
);
assert(
  isClientOrganisation({ typeClient: "particulier" }) === false,
  "particulier ≠ organisation",
);

console.log("\n2. Numérotation (défauts nouveaux comptes)");
const fresh = freshCompanyParametres();
assert(fresh.prefixeDevis === DEFAULT_PREFIXE_DEVIS, "préfixe devis défaut");
assert(fresh.prefixeFacture === DEFAULT_PREFIXE_FACTURE, "préfixe facture défaut");
assert(fresh.separateurNumero === DEFAULT_SEPARATEUR_NUMERO, "séparateur défaut");
assert(fresh.longueurCompteur === DEFAULT_LONGUEUR_COMPTEUR, "longueur défaut");
assert(fresh.anneeAutomatique === true, "année auto défaut");
assert(fresh.entreprise === "", "entreprise vide pour nouveau compte");
assert(fresh.siret === "", "siret vide pour nouveau compte");

const year = new Date().getFullYear();
assert(
  formatNumeroExample("DEV", true, 1) === `DEV-${year}-001`,
  "exemple défaut DEV-YEAR-001",
);
assert(
  formatNumeroExample("FAC", true, 12, { separateur: "/", longueurCompteur: 4 }) ===
    `FAC/${year}/0012`,
  "exemple personnalisé FAC/YEAR/0012",
);
assert(normalizeSeparateurNumero("/") === "/", "séparateur /");
assert(normalizeSeparateurNumero("") === "-", "séparateur vide → défaut");
assert(normalizeLongueurCompteur(5) === 5, "longueur 5");
assert(normalizeLongueurCompteur(99) === 8, "longueur max 8");

const custom = freshCompanyParametres({
  prefixeDevis: "DEVIS",
  prefixeFacture: "FACTURE",
  separateurNumero: "_",
  longueurCompteur: 4,
  anneeAutomatique: false,
  compteurDevis: 7,
  compteurFacture: 3,
});
assert(
  generateNextNumeroDevis([], custom) === "DEVIS_0007",
  "génération devis personnalisée",
);
assert(
  generateNextNumeroFacture([], custom) === "FACTURE_0003",
  "génération facture personnalisée",
);

console.log("\n3. Isolation entreprise (companyId = user.id)");
const fakeUser = { id: "user-aaa-111", email: "a@test.fr" } as const;
assert(
  getCompanyIdForUser(fakeUser as never) === "user-aaa-111",
  "companyId = supabase user id",
);
const empty = emptyAppData({ email: "a@test.fr", utilisateur: "Alice" });
assert(empty.clients.length === 0, "workspace vide : pas de clients démo");
assert(empty.devis.length === 0, "workspace vide : pas de devis démo");
assert(empty.parametres.email === "a@test.fr", "email compte isolé");
assert(empty.parametres.prefixeDevis === "DEV", "numérotation défaut conservée");

console.log(
  failed === 0
    ? "\nTous les contrôles compte/entreprise sont OK."
    : `\n${failed} échec(s).`,
);
process.exit(failed === 0 ? 0 : 1);

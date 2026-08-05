/**
 * Inventaire des emails transactionnels Batimum.
 * node --experimental-strip-types scripts/verify-emails-inventory.mts
 */
import assert from "node:assert/strict";
import {
  buildBatimumEmailHtml,
  getBatimumEmailLogoUrl,
} from "../lib/email/batimum-email-layout.ts";
import {
  VERIFICATION_EMAIL_SUBJECT,
  buildVerificationEmailHtml,
  buildPasswordResetEmail,
  buildEmployeeInviteEmail,
  buildChantierAssignmentEmail,
} from "../lib/email/batimum-transactional-templates.ts";

const html = buildVerificationEmailHtml("123456");
assert.ok(html.includes("123456"));
assert.ok(html.includes("Confirmez votre adresse email"));
assert.ok(html.includes(getBatimumEmailLogoUrl()) || html.includes("BATIMUM"));
assert.equal(VERIFICATION_EMAIL_SUBJECT, "Votre code de vérification Batimum");

const reset = buildPasswordResetEmail({
  resetUrl: "https://batimum.fr/reinitialiser-mot-de-passe?code=x",
});
assert.ok(reset.html.includes("Choisir un nouveau mot de passe"));
assert.ok(reset.subject.includes("mot de passe"));

const invite = buildEmployeeInviteEmail({
  entreprise: "BTP Demo",
  dirigeant: "Alex",
  role: "Ouvrier",
});
assert.ok(invite.html.includes("Accéder à mon espace employé"));
assert.ok(invite.subject.includes("rejoindre"));
assert.ok(invite.text.includes("espace"));
assert.ok(invite.text.includes("Ouvrier"));

const assign = buildChantierAssignmentEmail({
  chantierNom: "Salle de bain",
  adresse: "10 rue de la Paix",
});
assert.ok(assign.html.includes("Voir mon planning"));
assert.ok(!assign.html.toLowerCase().includes("marge"));

const layout = buildBatimumEmailHtml({
  title: "Test",
  bodyHtml: "<p>Hello</p>",
  button: { label: "OK", href: "https://batimum.fr" },
});
assert.ok(layout.includes("#111111"));
assert.ok(layout.includes("BATIMUM"));

console.log("verify-emails-inventory: ok");
console.log(
  JSON.stringify(
    [
      {
        email: "verification",
        service: "Resend",
        subject: VERIFICATION_EMAIL_SUBJECT,
      },
      {
        email: "password_reset",
        service: "Supabase Auth (template doc) + builder prêt",
        subject: reset.subject,
      },
      {
        email: "employee_invite",
        service: "Template prêt (envoi à brancher)",
        subject: invite.subject,
      },
      {
        email: "chantier_assignment",
        service: "Template prêt (envoi à brancher)",
        subject: assign.subject,
      },
      {
        email: "devis / facture / signature / relances",
        service: "Gmail/Microsoft OAuth via /api/send-reminder-email",
        subject: "objets modernisés + HTML Batimum",
      },
    ],
    null,
    2,
  ),
);

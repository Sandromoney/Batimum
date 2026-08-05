import {
  buildBatimumEmailHtml,
  escapeEmailHtml,
  getBatimumAppUrl,
  paragraphsToEmailHtml,
  plainTextFromParagraphs,
} from "@/lib/email/batimum-email-layout";

export const VERIFICATION_EMAIL_SUBJECT =
  "Votre code de vérification Batimum";

export function buildVerificationEmailText(code: string): string {
  return plainTextFromParagraphs([
    "Confirmez votre adresse email",
    "",
    "Utilisez le code ci-dessous pour terminer votre inscription à Batimum.",
    "",
    code,
    "",
    "Ce code expire dans 10 minutes.",
    "",
    "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
    "",
    "L'équipe Batimum",
  ]);
}

export function buildVerificationEmailHtml(code: string): string {
  return buildBatimumEmailHtml({
    title: "Confirmez votre adresse email",
    preheader: "Votre code de vérification Batimum",
    introHtml:
      "Utilisez le code ci-dessous pour terminer votre inscription à Batimum.",
    codeBlock: code,
    bodyHtml: `<p style="margin:0;text-align:center;color:#6B7280;font-size:14px;">Ce code expire dans <strong style="color:#111111;">10 minutes</strong>.</p>`,
    footerNote:
      "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
  });
}

export const PASSWORD_RESET_EMAIL_SUBJECT =
  "Réinitialisez votre mot de passe Batimum";

export function buildPasswordResetEmail(input: {
  resetUrl: string;
  expiresMinutes?: number;
}): { subject: string; text: string; html: string } {
  const minutes = input.expiresMinutes ?? 60;
  return {
    subject: PASSWORD_RESET_EMAIL_SUBJECT,
    text: plainTextFromParagraphs([
      "Réinitialisez votre mot de passe",
      "",
      "Une demande de réinitialisation a été faite pour votre compte Batimum.",
      `Ce lien est valable ${minutes} minutes.`,
      "",
      input.resetUrl,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
      "",
      "L'équipe Batimum",
    ]),
    html: buildBatimumEmailHtml({
      title: "Réinitialisez votre mot de passe",
      preheader: PASSWORD_RESET_EMAIL_SUBJECT,
      introHtml:
        "Une demande de réinitialisation a été faite pour votre compte Batimum.",
      bodyHtml: `<p style="margin:0;text-align:center;color:#6B7280;">Ce lien est valable <strong style="color:#111111;">${minutes} minutes</strong>.</p>`,
      button: {
        label: "Choisir un nouveau mot de passe",
        href: input.resetUrl,
      },
      footerNote:
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    }),
  };
}

export const EMPLOYEE_INVITE_EMAIL_SUBJECT_PREFIX =
  "Vous êtes invité à rejoindre";

export function buildEmployeeInviteEmail(input: {
  entreprise: string;
  dirigeant?: string;
  role?: string;
  loginUrl?: string;
  employeeName?: string;
}): { subject: string; text: string; html: string } {
  const loginUrl = input.loginUrl ?? getBatimumAppUrl("/login-employe");
  const role = input.role?.trim() || "Collaborateur";
  const subject = `${EMPLOYEE_INVITE_EMAIL_SUBJECT_PREFIX} ${input.entreprise}`;

  const accessLines = [
    "Dans votre espace employé, vous pourrez consulter votre planning et vos chantiers affectés.",
    "Vous n'aurez pas accès aux devis, marges, facturation ni aux paramètres de l'entreprise.",
  ];

  return {
    subject,
    text: plainTextFromParagraphs([
      subject,
      "",
      input.employeeName ? `Bonjour ${input.employeeName},` : "Bonjour,",
      "",
      `${input.entreprise}${
        input.dirigeant ? ` (${input.dirigeant})` : ""
      } vous invite à rejoindre Batimum en tant que ${role}.`,
      "",
      ...accessLines,
      "",
      `Accéder à mon espace : ${loginUrl}`,
      "",
      "L'équipe Batimum",
    ]),
    html: buildBatimumEmailHtml({
      title: "Invitation à l'espace employé",
      preheader: subject,
      introHtml: `${escapeEmailHtml(input.entreprise)}${
        input.dirigeant
          ? ` <span style="color:#6B7280;">(${escapeEmailHtml(input.dirigeant)})</span>`
          : ""
      } vous invite à rejoindre Batimum.`,
      bodyHtml: `
        <p style="margin:0 0 12px 0;">Rôle : <strong>${escapeEmailHtml(role)}</strong></p>
        <p style="margin:0 0 8px 0;color:#6B7280;">${escapeEmailHtml(accessLines[0]!)}</p>
        <p style="margin:0;color:#6B7280;">${escapeEmailHtml(accessLines[1]!)}</p>
      `,
      button: {
        label: "Accéder à mon espace employé",
        href: loginUrl,
      },
    }),
  };
}

export function buildChantierAssignmentEmail(input: {
  chantierNom: string;
  adresse?: string;
  dateDebut?: string;
  dateFin?: string;
  horaires?: string;
  consignes?: string;
  responsable?: string;
  planningUrl?: string;
}): { subject: string; text: string; html: string } {
  const subject = `Nouvelle affectation : ${input.chantierNom}`;
  const planningUrl =
    input.planningUrl ?? getBatimumAppUrl("/planning-employe");

  const details: string[] = [];
  if (input.adresse) details.push(`Adresse : ${input.adresse}`);
  if (input.dateDebut || input.dateFin) {
    details.push(
      `Dates : ${[input.dateDebut, input.dateFin].filter(Boolean).join(" → ")}`,
    );
  }
  if (input.horaires) details.push(`Horaires : ${input.horaires}`);
  if (input.responsable) details.push(`Responsable : ${input.responsable}`);
  if (input.consignes) details.push(`Consignes : ${input.consignes}`);

  return {
    subject,
    text: plainTextFromParagraphs([
      subject,
      "",
      `Vous êtes affecté au chantier « ${input.chantierNom} ».`,
      "",
      ...details,
      "",
      `Voir mon planning : ${planningUrl}`,
      "",
      "L'équipe Batimum",
    ]),
    html: buildBatimumEmailHtml({
      title: "Nouvelle affectation chantier",
      preheader: subject,
      introHtml: `Vous êtes affecté au chantier <strong>${escapeEmailHtml(
        input.chantierNom,
      )}</strong>.`,
      bodyHtml: details
        .map(
          (line) =>
            `<p style="margin:0 0 8px 0;color:#374151;">${escapeEmailHtml(line)}</p>`,
        )
        .join(""),
      button: {
        label: "Voir mon planning",
        href: planningUrl,
      },
      footerNote:
        "Cet email ne contient aucune information de marge, devis ou donnée confidentielle dirigeant.",
    }),
  };
}

export function wrapCompanyMessageAsBatimumHtml(input: {
  title: string;
  message: string;
  button?: { label: string; href: string };
  preheader?: string;
}): string {
  return buildBatimumEmailHtml({
    title: input.title,
    preheader: input.preheader,
    bodyHtml: `<p style="margin:0;">${paragraphsToEmailHtml(input.message)}</p>`,
    button: input.button,
  });
}

/**
 * Templates email de vérification — délègue au layout premium Batimum.
 */
export {
  VERIFICATION_EMAIL_SUBJECT,
  buildVerificationEmailHtml,
  buildVerificationEmailText,
} from "@/lib/email/batimum-transactional-templates";

export { getBatimumEmailLogoUrl as getVerificationEmailLogoUrl } from "@/lib/email/batimum-email-layout";

import { validateEmail } from "@/lib/validations";

export type SignupField = "email" | "password" | "confirmPassword";

export type SignupFieldErrors = Partial<Record<SignupField, string>>;

export const SIGNUP_STRIPE_ERROR_MESSAGE =
  "Impossible d'ouvrir le paiement. Vérifiez la configuration Stripe.";

export function validateSignupFields(
  values: {
    email: string;
    password: string;
    confirmPassword: string;
  },
  options?: {
    showAll?: boolean;
    touched?: Partial<Record<SignupField, boolean>>;
  },
): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  const show = (field: SignupField) =>
    Boolean(options?.showAll || options?.touched?.[field]);

  if (show("email")) {
    if (!values.email.trim()) errors.email = "Ce champ est obligatoire";
    else if (!validateEmail(values.email)) errors.email = "Email invalide";
  }
  if (show("password")) {
    if (!values.password) errors.password = "Ce champ est obligatoire";
    else if (values.password.length < 8) {
      errors.password = "Mot de passe trop court (8 caractères minimum)";
    }
  }
  if (show("confirmPassword")) {
    if (!values.confirmPassword) {
      errors.confirmPassword = "Ce champ est obligatoire";
    } else if (values.confirmPassword !== values.password) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas";
    }
  }

  return errors;
}

export function hasSignupFieldErrors(errors: SignupFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

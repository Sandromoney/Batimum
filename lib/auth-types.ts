/** Rôle applicatif — V1 locale, migration Supabase/RLS prévue en production. */
export type AppRole = "admin" | "employe";

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  employe: "Employé",
};

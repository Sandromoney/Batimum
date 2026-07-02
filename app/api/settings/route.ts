import { NextResponse } from "next/server";
import {
  formatUserSettingsError,
  loadUserSettingsFromSupabase,
  saveUserSettingsToSupabase,
  type UserSettingsPayload,
} from "@/lib/user-settings-store";
import { normalizeParametres } from "@/lib/parametres";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";
import {
  hasValidationErrors,
  validateParametresSave,
} from "@/lib/validations";
import type { Employe, Parametres } from "@/lib/types";

export const runtime = "nodejs";

function normalizeEmployes(value: unknown): Employe[] {
  if (!Array.isArray(value)) return [];
  return value.map((employe) => ({
    ...employe,
    prenom: employe.prenom ?? "",
    nom: employe.nom ?? "",
    statut: employe.statut === "desactive" ? "desactive" : ("actif" as const),
  }));
}

export async function GET() {
  console.log("[user-settings] load start");

  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) {
    return NextResponse.json(
      {
        error: "Session expirée ou introuvable. Reconnectez-vous.",
        code: "session_expired",
      },
      { status: 401 },
    );
  }

  const { settings, error } = await loadUserSettingsFromSupabase(authUser.id);

  if (error) {
    console.error("[user-settings] load error", error);
    return NextResponse.json(
      {
        error: formatUserSettingsError(error),
        parametres: null,
        employes: null,
      },
      { status: 500 },
    );
  }

  console.log("[user-settings] load success", {
    userId: authUser.id,
    hasSettings: Boolean(settings),
  });

  return NextResponse.json({
    parametres: settings?.parametres ?? null,
    employes: settings?.employes ?? null,
  });
}

export async function PUT(request: Request) {
  console.log("[user-settings] save start");

  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) {
    return NextResponse.json(
      {
        error: "Session expirée ou introuvable. Reconnectez-vous.",
        code: "session_expired",
      },
      { status: 401 },
    );
  }

  let body: { parametres?: Parametres; employes?: Employe[] };
  try {
    body = (await request.json()) as {
      parametres?: Parametres;
      employes?: Employe[];
    };
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  if (!body.parametres) {
    return NextResponse.json(
      { error: "Paramètres manquants." },
      { status: 400 },
    );
  }

  const parametres = normalizeParametres(body.parametres);
  const validationErrors = validateParametresSave(parametres);
  if (hasValidationErrors(validationErrors)) {
    const firstError = Object.values(validationErrors).find(Boolean);
    return NextResponse.json(
      { error: firstError ?? "Validation échouée." },
      { status: 400 },
    );
  }

  const payload: UserSettingsPayload = {
    parametres,
    employes: normalizeEmployes(body.employes),
  };

  const { error } = await saveUserSettingsToSupabase(authUser.id, payload);

  if (error) {
    console.error("[user-settings] save error", error);
    return NextResponse.json(
      { error: formatUserSettingsError(error) },
      { status: 500 },
    );
  }

  console.log("[user-settings] save success", { userId: authUser.id });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import {
  formatUserSettingsError,
  loadCompanyWorkspace,
  saveCompanyWorkspace,
} from "@/lib/user-settings-store";
import {
  appDataToWorkspace,
  emptyWorkspacePayload,
  normalizeOperationalPayload,
  normalizeWorkspacePayload,
  type CompanyWorkspacePayload,
  type UserSettingsOperationalPayload,
} from "@/lib/user-settings-types";
import { normalizeParametres } from "@/lib/parametres";
import { resolveSettingsAuthContext } from "@/lib/supabase-auth-server";
import type { AppData, Employe, Parametres } from "@/lib/types";

export const runtime = "nodejs";

const SESSION_EXPIRED_MESSAGE =
  "Impossible d'enregistrer les paramètres. Veuillez vous reconnecter.";

function normalizeEmployes(value: unknown): Employe[] {
  if (!Array.isArray(value)) return [];
  return value.map((employe) => ({
    ...employe,
    prenom: employe.prenom ?? "",
    nom: employe.nom ?? "",
    statut: employe.statut === "desactive" ? "desactive" : ("actif" as const),
  }));
}

export async function GET(request: Request) {
  const auth = await resolveSettingsAuthContext(request);
  if (!auth) {
    return NextResponse.json(
      {
        error: SESSION_EXPIRED_MESSAGE,
        code: "session_expired",
      },
      { status: 401 },
    );
  }

  const { workspace, error, missingColumns } = await loadCompanyWorkspace(
    auth.user.id,
  );

  if (error) {
    return NextResponse.json(
      {
        error: formatUserSettingsError(error, { hasSession: true }),
        code: error.code,
        parametres: null,
        employes: null,
        workspace: null,
      },
      { status: 500 },
    );
  }

  if (!workspace) {
    return NextResponse.json({
      parametres: null,
      employes: null,
      operational: null,
      workspace: null,
      missingColumns: Boolean(missingColumns),
    });
  }

  return NextResponse.json({
    parametres: workspace.parametres,
    employes: workspace.employes,
    operational: {
      planning: workspace.planning,
      chantiers: workspace.chantiers,
      affectations: workspace.affectations,
      clients: workspace.clients,
    },
    workspace,
    missingColumns: Boolean(missingColumns),
  });
}

export async function PUT(request: Request) {
  const auth = await resolveSettingsAuthContext(request);
  if (!auth) {
    return NextResponse.json(
      {
        error: SESSION_EXPIRED_MESSAGE,
        code: "session_expired",
      },
      { status: 401 },
    );
  }

  let body: {
    parametres?: Parametres;
    employes?: Employe[];
    operational?: Partial<UserSettingsOperationalPayload>;
    workspace?: Partial<CompanyWorkspacePayload>;
    appData?: AppData;
    localImportCompletedAt?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const existing = await loadCompanyWorkspace(auth.user.id);
  const base = existing.workspace ?? emptyWorkspacePayload();

  let next: CompanyWorkspacePayload;

  if (body.appData) {
    next = appDataToWorkspace(
      body.appData,
      body.localImportCompletedAt ??
        body.workspace?.localImportCompletedAt ??
        base.localImportCompletedAt,
    );
  } else if (body.workspace || body.parametres) {
    const operational = normalizeOperationalPayload(
      body.operational ?? {
        planning: base.planning,
        chantiers: base.chantiers,
        affectations: base.affectations,
        clients: base.clients,
      },
    );
    next = normalizeWorkspacePayload({
      ...base,
      ...body.workspace,
      parametres: normalizeParametres(
        body.parametres ?? body.workspace?.parametres ?? base.parametres,
      ),
      employes: normalizeEmployes(
        body.employes ?? body.workspace?.employes ?? base.employes,
      ),
      planning: body.workspace?.planning ?? operational.planning,
      chantiers: body.workspace?.chantiers ?? operational.chantiers,
      affectations: body.workspace?.affectations ?? operational.affectations,
      clients: body.workspace?.clients ?? operational.clients,
      localImportCompletedAt:
        body.localImportCompletedAt ??
        body.workspace?.localImportCompletedAt ??
        base.localImportCompletedAt,
    });
  } else {
    return NextResponse.json(
      { error: "Paramètres ou workspace manquants." },
      { status: 400 },
    );
  }

  // Validation légère : entreprise + email pour éviter les payloads vides accidentels.
  if (!next.parametres.entreprise?.trim() && !next.parametres.email?.trim()) {
    return NextResponse.json(
      { error: "Paramètres entreprise incomplets." },
      { status: 400 },
    );
  }

  const { error, missingColumns } = await saveCompanyWorkspace(
    auth.user.id,
    next,
  );

  if (error) {
    const status =
      error.code === "session_expired"
        ? 401
        : error.code === "PGRST204"
          ? 503
          : 500;
    return NextResponse.json(
      {
        error: formatUserSettingsError(error, {
          hasSession: status !== 401,
        }),
        code: error.code,
        missingColumns: Boolean(missingColumns),
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    missingColumns: Boolean(missingColumns),
  });
}

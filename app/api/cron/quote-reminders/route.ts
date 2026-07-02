import { NextResponse } from "next/server";

/**
 * Route cron Vercel pour les relances devis.
 * Les données devis vivent actuellement côté client (localStorage) ;
 * l'automatisation principale est déclenchée via app-sync + app-notifications.
 * Cette route prépare l'intégration serveur (CRON_SECRET).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, message: "Non autorisé." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        ok: false,
        message: "CRON_SECRET manquant — configurez la variable sur Vercel.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    processed: 0,
    message:
      "Cron relances devis prêt. Traitement automatique actif côté application ; branchez ici la persistance serveur des devis pour l'envoi batch.",
  });
}

export const dynamic = "force-dynamic";

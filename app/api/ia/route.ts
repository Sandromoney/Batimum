import { NextResponse } from "next/server";

/** V1 bêta — MUM IA désactivé, aucun appel OpenAI. */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Disponible dans une prochaine version.",
    },
    { status: 503 },
  );
}

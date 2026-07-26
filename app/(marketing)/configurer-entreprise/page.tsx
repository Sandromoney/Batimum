"use client";

import { Suspense } from "react";
import ConfigurerEntrepriseForm from "./configurer-entreprise-form";

export default function ConfigurerEntreprisePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </main>
      }
    >
      <ConfigurerEntrepriseForm />
    </Suspense>
  );
}

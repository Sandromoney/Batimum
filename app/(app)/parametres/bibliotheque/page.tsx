import { Suspense } from "react";
import { ParametresBibliothequePage } from "@/components/parametres-bibliotheque";

export default function BibliothequeEntreprisePage() {
  return (
    <Suspense fallback={null}>
      <ParametresBibliothequePage />
    </Suspense>
  );
}

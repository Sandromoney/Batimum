"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirection des anciens liens /signature/devis/{token} */
export default function LegacySignatureDevisRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.id === "string" ? params.id : "";

  useEffect(() => {
    if (token) {
      router.replace(`/signature/${encodeURIComponent(token)}`);
    }
  }, [token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Redirection vers la signature…
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Page pré-paiement désactivée — redirection vers signup. */
export default function CheckoutPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/signup");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Redirection…
    </main>
  );
}

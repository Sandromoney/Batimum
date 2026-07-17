import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingFooter } from "@/components/marketing-footer";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export default function AbonnementCancelPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <BrandLogo variant="marketing" imageClassName="mb-8" />
        <Card className="space-y-4 p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Paiement annulé</h1>
          <p className="text-sm text-muted-foreground">
            Vous pouvez reprendre l&apos;inscription quand vous le souhaitez.
          </p>
          <ButtonLink href="/landing#tarifs" className="w-full justify-center">
            Retour aux tarifs
          </ButtonLink>
          <Link href="/signup" className="block text-sm text-primary hover:underline">
            Reprendre l&apos;essai gratuit
          </Link>
        </Card>
      </div>
      <MarketingFooter />
    </main>
  );
}

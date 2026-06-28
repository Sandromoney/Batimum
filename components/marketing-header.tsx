import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const btnSecondaryClass =
  "landing-btn-secondary inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground no-underline shadow-card transition-all hover:bg-card-hover active:scale-[0.98]";

export function MarketingHeader() {
  return (
    <header className="border-b border-border">
      <section className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="landing-logo flex shrink-0 items-center justify-center no-underline"
        >
          <BrandLogo variant="landing" showSubtitle={false} />
        </Link>
        <Link href="/login" className={cn(btnSecondaryClass, "px-4 py-2")}>
          Se connecter
        </Link>
      </section>
    </header>
  );
}

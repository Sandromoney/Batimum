import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalPageLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingHeader />
      <article className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-8 lg:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Informations légales
        </p>
        <h1 className="mb-10 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <div className="space-y-8 text-sm leading-7 text-muted-foreground">
          {children}
        </div>
      </article>
      <MarketingFooter />
    </main>
  );
}

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ParametresSection({
  id,
  title,
  description,
  children,
  className,
  modified = false,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  modified?: boolean;
}) {
  return (
    <Card className={cn("w-full", className)}>
      <div id={id} className={id ? "scroll-mt-24" : undefined}>
      <header className="mb-6 border-b border-border/60 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
          {modified ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
              Modifications non enregistrées
            </span>
          ) : null}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
      </div>
    </Card>
  );
}

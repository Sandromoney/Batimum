import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ParametresSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("w-full", className)}>
      <div id={id} className={id ? "scroll-mt-24" : undefined}>
      <header className="mb-6 border-b border-border/60 pb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
      </div>
    </Card>
  );
}

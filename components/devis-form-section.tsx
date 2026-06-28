import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DevisFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("w-full", className)}>
      <header className="mb-5 border-b border-border/60 pb-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

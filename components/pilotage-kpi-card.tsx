import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PilotageKpiCard({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        "min-w-0 border-border/50 bg-card-elevated/30 p-4",
        highlight && "border-border/70",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-xl font-semibold tabular-nums text-foreground sm:text-2xl",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </Card>
  );
}

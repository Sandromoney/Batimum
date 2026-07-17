import { Card } from "@/components/ui/card";
import { DashboardInfoBubble } from "@/components/dashboard-info-bubble";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  details,
  icon: Icon,
  helpText,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  details?: string[];
  icon: LucideIcon;
  helpText?: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "group relative flex min-w-0 items-start justify-between gap-4 p-5",
        "border-border/70 transition-all duration-200 ease-out",
        "hover:-translate-y-[3px] hover:border-border hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      {helpText ? (
        <DashboardInfoBubble className="absolute bottom-full left-1/2 mb-2.5 w-[min(100%,14rem)] -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <p className="text-xs leading-relaxed text-muted-foreground">{helpText}</p>
        </DashboardInfoBubble>
      ) : null}

      <span className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2.5 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.75rem]">
          {value}
        </p>
        {details && details.length > 0 ? (
          <ul className="mt-2.5 space-y-1">
            {details.map((line) => (
              <li
                key={line}
                className="text-xs font-medium leading-relaxed text-muted"
              >
                {line}
              </li>
            ))}
          </ul>
        ) : (
          sub && <p className="mt-2 text-xs font-medium text-muted">{sub}</p>
        )}
      </span>
      <span className="rounded-xl bg-card-elevated p-3 text-muted-foreground ring-1 ring-border/80 transition-transform duration-200 group-hover:scale-105">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
    </Card>
  );
}

import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  details,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  details?: string[];
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "group btp-card-interactive flex min-w-0 items-start justify-between gap-4 p-5",
        className,
      )}
    >
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
      <span className="rounded-xl bg-primary/10 p-3 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-105">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
    </Card>
  );
}

import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  size = "md",
  className,
  label,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        {label ? (
          <span className="font-medium text-muted-foreground">{label}</span>
        ) : (
          <span className="sr-only">Avancement</span>
        )}
        <span className="font-semibold text-foreground">{clamped}%</span>
      </div>
      <div
        className={cn("btp-progress", size === "sm" ? "btp-progress-sm" : "btp-progress-md")}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="btp-progress-fill"
          data-empty={clamped === 0 ? "true" : "false"}
          style={{ width: clamped > 0 ? `${clamped}%` : "0%" }}
        />
      </div>
    </div>
  );
}

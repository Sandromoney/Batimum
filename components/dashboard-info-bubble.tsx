import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardInfoBubble({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none z-30 rounded-xl border border-border/80 bg-white px-3.5 py-2.5 text-left shadow-[0_14px_32px_rgba(15,23,42,0.08)]",
        className,
      )}
      role="tooltip"
    >
      {children}
    </div>
  );
}

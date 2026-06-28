import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "btp-card rounded-[1.35rem] border border-border/80 bg-card/95 p-6 shadow-card",
        className,
      )}
    >
      {children}
    </article>
  );
}

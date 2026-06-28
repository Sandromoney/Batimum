import type { KeyboardEvent, ReactNode } from "react";

export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/95 shadow-card">
      <span className="block overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-card-elevated/70 text-left">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/90"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">{children}</tbody>
        </table>
      </span>
    </section>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`px-5 py-4 align-middle text-foreground/90 ${className ?? ""}`}
    >
      {children}
    </td>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return (
    <section
      className="flex flex-wrap gap-2"
      data-row-actions
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </section>
  );
}

export function Tr({
  children,
  onClick,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <tr
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? ariaLabel : undefined}
      className={`transition-colors duration-200${
        onClick
          ? " cursor-pointer hover:bg-card-hover/80 focus-visible:bg-card-hover/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary/40 active:bg-card-hover"
          : " hover:bg-card-hover/70"
      }${className ? ` ${className}` : ""}`}
    >
      {children}
    </tr>
  );
}

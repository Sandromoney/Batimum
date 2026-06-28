"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EMPLOYEE_NAV_ITEMS,
  isEmployeeNavItemActive,
} from "@/lib/employee-nav";
import { cn } from "@/lib/utils";

export function EmployeeDesktopNav() {
  const pathname = usePathname();
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    setNavReady(true);
  }, []);

  return (
    <nav
      className="hidden border-b border-border/60 bg-sidebar/50 md:block"
      aria-label="Navigation employé"
    >
      <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 py-2">
        {EMPLOYEE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            navReady && isEmployeeNavItemActive(pathname ?? "", href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-card-hover/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

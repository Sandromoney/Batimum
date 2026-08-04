"use client";

import type { ReactNode } from "react";
import { AuthCloseButton } from "@/components/marketing/auth-close-button";
import { AuthMarketingPanel } from "@/components/marketing/auth-marketing-panel";
import { cn } from "@/lib/utils";

type AuthSplitLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Affiche le bouton Fermer (défaut true). */
  showClose?: boolean;
};

export function AuthSplitLayout({
  children,
  footer,
  className,
  showClose = true,
}: AuthSplitLayoutProps) {
  return (
    <div className={cn("auth-split flex min-h-screen flex-col", className)}>
      {showClose ? (
        <div className="auth-close-bar">
          <AuthCloseButton />
        </div>
      ) : null}
      <div className="auth-split__grid flex min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,55%)_minmax(0,45%)]">
        <section className="auth-split__form flex items-center justify-center px-6 py-10 lg:px-10 xl:px-14">
          <div className="w-full max-w-md">{children}</div>
        </section>

        <aside className="auth-split__panel hidden border-l border-[rgba(17,17,17,0.06)] bg-[#f6f7f9] lg:block">
          <AuthMarketingPanel />
        </aside>
      </div>
      {footer}
    </div>
  );
}

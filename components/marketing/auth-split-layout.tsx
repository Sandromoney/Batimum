import type { ReactNode } from "react";
import { AuthMarketingPanel } from "@/components/marketing/auth-marketing-panel";
import { cn } from "@/lib/utils";

type AuthSplitLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AuthSplitLayout({
  children,
  footer,
  className,
}: AuthSplitLayoutProps) {
  return (
    <div className={cn("auth-split flex min-h-screen flex-col", className)}>
      <div className="auth-split__grid flex min-h-screen flex-1 lg:grid lg:grid-cols-[minmax(0,55%)_minmax(0,45%)]">
        <section className="auth-split__form flex items-center justify-center px-6 py-10 lg:px-10 xl:px-14">
          <div className="w-full max-w-md">{children}</div>
        </section>

        <aside className="auth-split__panel hidden border-l border-[rgba(15,23,42,0.06)] bg-[#f8faf8] lg:block">
          <AuthMarketingPanel />
        </aside>
      </div>
      {footer}
    </div>
  );
}

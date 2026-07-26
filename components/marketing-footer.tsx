import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LEGAL_LINKS } from "@/lib/legal-constants";
import { cn } from "@/lib/utils";

const LANDING_FOOTER_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
  { href: "mailto:contact@batimum.fr", label: "Contact" },
] as const;

type MarketingFooterProps = {
  variant?: "default" | "landing";
};

export function MarketingFooter({ variant = "default" }: MarketingFooterProps) {
  const links = variant === "landing" ? LANDING_FOOTER_LINKS : LEGAL_LINKS;
  const isLanding = variant === "landing";

  return (
    <footer
      className={cn(
        "marketing-footer border-t",
        isLanding
          ? "border-[#E5E7EB] bg-white text-[#6B7280]"
          : "border-border bg-transparent text-muted-foreground",
      )}
    >
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-10 text-sm sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
        <div className="flex flex-col gap-2">
          <div
            className={cn(
              "flex items-center gap-3",
              isLanding ? "text-[#111827]" : "text-foreground",
            )}
          >
            <BrandLogo variant="footer" showSubtitle={false} />
          </div>
          {isLanding ? (
            <p className="text-xs text-[#6B7280]">
              La solution tout-en-un des dirigeants du BTP.
            </p>
          ) : null}
          <p
            className={cn(
              "text-xs",
              isLanding ? "text-[#9CA3AF]" : "text-muted-foreground",
            )}
          >
            © 2026 Batimum. Tous droits réservés.
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center gap-x-1 gap-y-2"
          aria-label="Liens légaux"
        >
          {links.map((link, index) => (
            <span key={link.href} className="inline-flex items-center">
              {index > 0 && (
                <span className="mx-2 text-[#D1D5DB]" aria-hidden="true">
                  |
                </span>
              )}
              <Link
                href={link.href}
                className={cn(
                  "no-underline transition-colors",
                  isLanding
                    ? "text-[#6B7280] hover:text-[#111827]"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </section>
    </footer>
  );
}

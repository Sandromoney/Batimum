import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LEGAL_LINKS } from "@/lib/legal-constants";

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

  return (
    <footer className="border-t border-border">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-foreground">
            <BrandLogo variant="footer" showSubtitle={false} />
          </div>
          {variant === "landing" ? (
            <p className="text-xs text-muted-foreground">
              © 2026 Batimum. Tous droits réservés.
            </p>
          ) : null}
        </div>
        <nav
          className="flex flex-wrap items-center gap-x-1 gap-y-2"
          aria-label="Liens légaux"
        >
          {links.map((link, index) => (
            <span key={link.href} className="inline-flex items-center">
              {index > 0 && (
                <span className="mx-2 text-border" aria-hidden="true">
                  |
                </span>
              )}
              <Link
                href={link.href}
                className="no-underline hover:text-foreground"
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

"use client";

import Link from "next/link";
import { writeLandingSnapshot } from "@/components/landing/landing-experience";

const NAV = [
  { href: "/landing#ecosysteme", label: "Fonctionnalités" },
  { href: "/landing#plans", label: "Tarifs" },
  { href: "/landing#faq", label: "Ressources" },
  { href: "/login", label: "Connexion", persist: true },
] as const;

const LEGAL = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
  { href: "/cgv", label: "CGV" },
] as const;

export function LandingFooter() {
  return (
    <footer className="lp-footer" aria-label="Pied de page Batimum">
      <div className="lp-container lp-footer__inner">
        <div className="lp-footer__top">
          <Link
            href="/landing"
            className="lp-footer__logo-link no-underline"
            aria-label="Batimum"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-batimum.png"
              alt="Batimum"
              className="lp-footer__logo"
              width={115}
              height={29}
              decoding="async"
            />
          </Link>

          <nav className="lp-footer__nav" aria-label="Navigation pied de page">
            {NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="no-underline"
                onClick={
                  "persist" in link && link.persist
                    ? () => writeLandingSnapshot()
                    : undefined
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="lp-footer__bottom">
          <nav className="lp-footer__legal" aria-label="Liens légaux">
            {LEGAL.map((link) => (
              <Link key={link.href} href={link.href} className="no-underline">
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="lp-footer__copy">
            © {new Date().getFullYear()} Batimum. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import {
  getLandingNavHash,
  LANDING_NAV_ENTRIES,
  type LandingNavItem,
  type LandingNavMenu,
} from "@/lib/landing-nav";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";
import { cn } from "@/lib/utils";

type LandingNavMenusProps = {
  className?: string;
  /** desktop = liens seuls ; mobile = bouton + panneau ; both = tout */
  variant?: "desktop" | "mobile" | "both";
};

function DropdownLink({
  item,
  onNavigate,
  variant,
}: {
  item: LandingNavItem;
  onNavigate: (href: string) => boolean;
  variant: "desktop" | "mobile";
}) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "landing-nav-dropdown__link group no-underline",
          variant === "desktop"
            ? "flex rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f8faf8]"
            : "flex gap-3 rounded-xl px-2 py-2.5 hover:bg-[#f8faf8]",
        )}
        onClick={(event) => {
          if (onNavigate(item.href)) event.preventDefault();
        }}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center text-[#10b981]",
            variant === "desktop"
              ? "mt-0.5 h-9 w-9 rounded-xl border border-[rgba(15,23,42,0.06)] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
              : "h-8 w-8 rounded-lg bg-[#f3f4f6]",
          )}
        >
          <Icon className={variant === "desktop" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-[#0f172a] group-hover:text-[#10b981]">
            {item.label}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-[#64748b]">
            {item.description}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function LandingNavMenus({
  className,
  variant = "both",
}: LandingNavMenusProps) {
  const pathname = usePathname();
  const panelId = useId();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const signupHref = getPublicSignupHref();
  const ctaLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";
  const showDesktop = variant === "desktop" || variant === "both";
  const showMobile = variant === "mobile" || variant === "both";

  const closeMenus = useCallback(() => setOpenMenuId(null), []);
  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setMobileExpandedId(null);
  }, []);

  const scrollToSection = useCallback(
    (href: string) => {
      const hash = getLandingNavHash(href);
      if (!hash) return false;

      const onLanding = pathname === "/landing" || pathname === "/landing/";
      if (!onLanding) return false;

      const target = document.getElementById(hash);
      if (!target) return false;

      target.scrollIntoView({ behavior: "smooth", block: "start" });
      closeMenus();
      closeMobile();
      return true;
    },
    [pathname, closeMenus, closeMobile],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) closeMenus();
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenus();
        closeMobile();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeMenus, closeMobile]);

  useEffect(() => {
    if (!showMobile) return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, showMobile]);

  return (
    <nav
      ref={navRef}
      className={cn("landing-nav", className)}
      aria-label="Navigation principale"
    >
      {showDesktop ? (
      <ul className="landing-nav__desktop">
        {LANDING_NAV_ENTRIES.map((entry) => {
          if (entry.type === "link") {
            return (
              <li key={entry.link.id}>
                <Link
                  href={entry.link.href}
                  className="landing-nav__trigger"
                  onClick={(event) => {
                    if (scrollToSection(entry.link.href)) event.preventDefault();
                  }}
                >
                  {entry.link.label}
                </Link>
              </li>
            );
          }

          const menu = entry.menu;
          const isOpen = openMenuId === menu.id;

          return (
            <li
              key={menu.id}
              className="landing-nav__item relative"
              onMouseEnter={() => setOpenMenuId(menu.id)}
              onMouseLeave={() => setOpenMenuId(null)}
            >
              <button
                type="button"
                className={cn(
                  "landing-nav__trigger",
                  isOpen && "landing-nav__trigger--open",
                )}
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={() =>
                  setOpenMenuId((current) =>
                    current === menu.id ? null : menu.id,
                  )
                }
              >
                {menu.label}
                <ChevronDown
                  className={cn(
                    "landing-nav__chevron",
                    isOpen && "landing-nav__chevron--open",
                  )}
                  aria-hidden
                />
              </button>

              <div
                className={cn(
                  "landing-nav-dropdown",
                  `landing-nav-dropdown--${menu.id}`,
                  isOpen && "landing-nav-dropdown--open",
                )}
              >
                <div className="landing-nav-dropdown__panel">
                  <ul className="space-y-0.5 p-2">
                    {menu.items.map((item) => (
                      <DropdownLink
                        key={item.label}
                        item={item}
                        onNavigate={scrollToSection}
                        variant="desktop"
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      ) : null}

      {showMobile ? (
        <>
      <button
        type="button"
        className="landing-nav__mobile-toggle"
        aria-expanded={mobileOpen}
        aria-controls={panelId}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? (
          <X className="h-5 w-5" aria-hidden />
        ) : (
          <Menu className="h-5 w-5" aria-hidden />
        )}
        <span className="sr-only">Menu</span>
      </button>

      <div
        id={panelId}
        className={cn(
          "landing-nav-mobile",
          mobileOpen && "landing-nav-mobile--open",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className="landing-nav-mobile__backdrop"
          aria-label="Fermer le menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={closeMobile}
        />
        <div className="landing-nav-mobile__sheet">
          <div className="landing-nav-mobile__head">
            <p>Menu</p>
            <button
              type="button"
              className="landing-nav-mobile__close"
              onClick={closeMobile}
              aria-label="Fermer"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="landing-nav-mobile__body">
            {LANDING_NAV_ENTRIES.map((entry) => {
              if (entry.type === "link") {
                return (
                  <Link
                    key={entry.link.id}
                    href={entry.link.href}
                    className="landing-nav-mobile__link"
                    onClick={(event) => {
                      if (scrollToSection(entry.link.href)) event.preventDefault();
                    }}
                  >
                    {entry.link.label}
                  </Link>
                );
              }

              const menu = entry.menu;
              const expanded = mobileExpandedId === menu.id;

              return (
                <MobileAccordion
                  key={menu.id}
                  menu={menu}
                  expanded={expanded}
                  onToggle={() =>
                    setMobileExpandedId((current) =>
                      current === menu.id ? null : menu.id,
                    )
                  }
                  onNavigate={scrollToSection}
                />
              );
            })}

            <Link
              href="/login-employe"
              className="landing-nav-mobile__link landing-nav-mobile__link--muted"
              onClick={closeMobile}
            >
              Connexion employé
            </Link>
          </div>

          <div className="landing-nav-mobile__foot">
            <Link
              href="/login"
              className="landing-header-btn landing-header-btn--secondary w-full"
              onClick={closeMobile}
            >
              Connexion
            </Link>
            <Link
              href={signupHref}
              className="landing-header-btn landing-header-btn--primary group w-full"
              onClick={closeMobile}
            >
              {ctaLabel}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </div>
        </>
      ) : null}
    </nav>
  );
}

function MobileAccordion({
  menu,
  expanded,
  onToggle,
  onNavigate,
}: {
  menu: LandingNavMenu;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (href: string) => boolean;
}) {
  return (
    <div className="landing-nav-mobile__accordion">
      <button
        type="button"
        className="landing-nav-mobile__accordion-btn"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        {menu.label}
        <ChevronDown
          className={cn(
            "landing-nav__chevron",
            expanded && "landing-nav__chevron--open",
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "landing-nav-mobile__accordion-panel",
          expanded && "landing-nav-mobile__accordion-panel--open",
        )}
      >
        <ul className="space-y-0.5 px-2 pb-2">
          {menu.items.map((item) => (
            <DropdownLink
              key={item.label}
              item={item}
              onNavigate={onNavigate}
              variant="mobile"
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

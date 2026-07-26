"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import {
  getLandingNavHash,
  LANDING_NAV_ENTRIES,
  type LandingNavItem,
  type LandingNavMenu,
} from "@/lib/landing-nav";
import { cn } from "@/lib/utils";

type LandingNavMenusProps = {
  className?: string;
};

const navTriggerClass =
  "landing-nav__trigger inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[#0f172a] transition-colors hover:bg-black/[0.03]";

function DropdownPanel({
  menu,
  onNavigate,
}: {
  menu: LandingNavMenu;
  onNavigate: (href: string) => boolean;
}) {
  return (
    <div className="landing-nav-dropdown__panel p-2">
      {menu.intro ? (
        <p className="landing-nav-dropdown__intro px-3 pb-2 pt-1 text-xs text-[#64748b]">
          {menu.intro}
        </p>
      ) : null}
      <ul className="space-y-0.5">
        {menu.items.map((item) => (
          <DropdownLink
            key={item.label}
            item={item}
            onNavigate={onNavigate}
            variant="desktop"
          />
        ))}
      </ul>
    </div>
  );
}

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

  if (variant === "desktop") {
    return (
      <li>
        <Link
          href={item.href}
          className="landing-nav-dropdown__link group flex rounded-2xl px-3 py-2.5 no-underline transition-colors hover:bg-[#f8faf8]"
          onClick={(event) => {
            if (onNavigate(item.href)) event.preventDefault();
          }}
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(15,23,42,0.06)] bg-white text-[#10b981] shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="landing-nav-dropdown__link-text min-w-0">
            <span className="block text-sm font-medium text-[#0f172a] group-hover:text-[#10b981]">
              {item.label}
            </span>
            <span className="landing-nav-dropdown__desc mt-0.5 block text-xs text-[#64748b]">
              {item.description}
            </span>
          </span>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        className="flex gap-3 rounded-xl px-2 py-2.5 no-underline hover:bg-[#f8faf8]"
        onClick={(event) => {
          if (onNavigate(item.href)) event.preventDefault();
        }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8faf8] text-[#10b981]">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-sm font-medium text-[#0f172a]">
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

export function LandingNavMenus({ className }: LandingNavMenusProps) {
  const pathname = usePathname();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const closeMenus = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setMobileExpandedId(null);
  }, []);

  const scrollToSection = useCallback(
    (href: string) => {
      const hash = getLandingNavHash(href);
      if (!hash) return false;

      const onLanding =
        pathname === "/landing" || pathname === "/landing/";

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
      if (!navRef.current?.contains(event.target as Node)) {
        closeMenus();
      }
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
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <nav
      ref={navRef}
      className={cn("landing-nav", className)}
      aria-label="Navigation principale"
    >
      <ul className="landing-nav__desktop hidden items-center xl:flex">
        {LANDING_NAV_ENTRIES.map((entry) => {
          if (entry.type === "link") {
            return (
              <li key={entry.link.id}>
                <Link
                  href={entry.link.href}
                  className={navTriggerClass}
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
                  navTriggerClass,
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
                    "h-3.5 w-3.5 text-[#64748b] transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>

              <div
                className={cn(
                  "landing-nav-dropdown pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] z-50 -translate-x-1/2 opacity-0",
                  `landing-nav-dropdown--${menu.id}`,
                  isOpen && "landing-nav-dropdown--open pointer-events-auto",
                )}
              >
                <DropdownPanel menu={menu} onNavigate={scrollToSection} />
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="landing-nav__mobile-toggle inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(15,23,42,0.08)] bg-white text-[#0f172a] shadow-[0_2px_8px_rgba(15,23,42,0.04)] xl:hidden"
        aria-expanded={mobileOpen}
        aria-controls="landing-nav-mobile-panel"
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
        <span className="sr-only">Menu</span>
      </button>

      <div
        id="landing-nav-mobile-panel"
        className={cn(
          "landing-nav-mobile fixed inset-0 z-[60] xl:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-[#0f172a]/20 backdrop-blur-[2px] transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          aria-label="Fermer le menu"
          onClick={closeMobile}
        />
        <div
          className={cn(
            "landing-nav-mobile__sheet absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-[#f8faf8] shadow-[-12px_0_40px_rgba(15,23,42,0.08)] transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.06)] px-5 py-4">
            <p className="text-sm font-semibold text-[#0f172a]">Menu</p>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#64748b] hover:bg-black/[0.04]"
              onClick={closeMobile}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {LANDING_NAV_ENTRIES.map((entry) => {
              if (entry.type === "link") {
                return (
                  <Link
                    key={entry.link.id}
                    href={entry.link.href}
                    className="mb-2 flex w-full items-center rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white px-4 py-3.5 text-sm font-semibold text-[#0f172a] no-underline hover:bg-[#f8faf8]"
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
                <div
                  key={menu.id}
                  className="mb-2 overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-[#0f172a]"
                    aria-expanded={expanded}
                    onClick={() =>
                      setMobileExpandedId((current) =>
                        current === menu.id ? null : menu.id,
                      )
                    }
                  >
                    {menu.label}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-[#64748b] transition-transform duration-200",
                        expanded && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      {menu.intro ? (
                        <p className="border-t border-[rgba(15,23,42,0.06)] px-4 py-2.5 text-xs leading-5 text-[#64748b]">
                          {menu.intro}
                        </p>
                      ) : null}
                      <ul className="space-y-0.5 border-t border-[rgba(15,23,42,0.06)] px-2 py-2">
                        {menu.items.map((item) => (
                          <DropdownLink
                            key={item.label}
                            item={item}
                            onNavigate={scrollToSection}
                            variant="mobile"
                          />
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

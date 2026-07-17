"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { buildGlobalSearchGroups } from "@/lib/global-search";

export function AppGlobalSearch() {
  const router = useRouter();
  const { data } = useStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const groups = useMemo(
    () => buildGlobalSearchGroups(data, query),
    [data, query],
  );

  const showPanel = open && query.trim().length >= 2;
  const hasResults = groups.length > 0;

  useEffect(() => {
    if (!showPanel) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showPanel]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleOpenResult(href: string) {
    setQuery("");
    setOpen(false);
    router.push(href);
  }

  return (
    <div ref={rootRef} className="relative mx-auto w-full min-w-0">
      <label className="sr-only" htmlFor="global-search">
        Recherche globale
      </label>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Search className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <input
        ref={inputRef}
        id="global-search"
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher… ex. devis refusés, client Martin, facture juillet"
        className="btp-shadow-sm h-11 w-full rounded-xl border border-border/80 bg-card/70 py-2 pl-10 pr-16 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground/70 hover:border-border hover:shadow-md focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/15"
        autoComplete="off"
        spellCheck={false}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border/70 bg-card-elevated/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80 shadow-sm sm:inline-flex"
      >
        <kbd className="font-sans">⌘</kbd>
        <kbd className="font-sans">K</kbd>
      </span>

      {showPanel && (
        <section
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(28rem,calc(100vh-6rem))] overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-card"
          role="listbox"
          aria-label="Résultats de recherche"
        >
          {!hasResults ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Aucun résultat trouvé.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.category}>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                    {group.label}
                  </p>
                  <ul className="space-y-1">
                    {group.results.map((result) => (
                      <li key={`${result.category}-${result.id}`}>
                        <button
                          type="button"
                          role="option"
                          onClick={() => handleOpenResult(result.href)}
                          className={cn(
                            "flex w-full items-start justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors",
                            "hover:border-border/80 hover:bg-card-hover",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {result.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          </span>
                          <span className="shrink-0 pt-0.5 text-xs font-medium text-primary">
                            Ouvrir
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

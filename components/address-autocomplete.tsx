"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AddressSuggestion } from "@/lib/maps/address-suggestion";

export type AddressAutocompleteValue = {
  adresse: string;
  codePostal: string;
  ville: string;
  pays?: string;
};

type AddressAutocompleteProps = {
  value: AddressAutocompleteValue;
  onChange: (value: AddressAutocompleteValue & { selectedFromSuggestion: boolean }) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  /** Si true, invite à choisir une suggestion (défaut: true). */
  requireSuggestion?: boolean;
  placeholder?: string;
  className?: string;
};

export function AddressAutocomplete({
  value,
  onChange,
  disabled,
  error,
  label = "Adresse",
  requireSuggestion = true,
  placeholder = "Ex. 18 Chemin des Lilas",
  className,
}: AddressAutocompleteProps) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-opt-${index}`;
  const [query, setQuery] = useState(value.adresse);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedFromSuggestion, setSelectedFromSuggestion] = useState(
    Boolean(value.adresse && value.codePostal && value.ville),
  );
  const [justSelected, setJustSelected] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(value.adresse);
  }, [value.adresse]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || selectedFromSuggestion) {
      if (trimmed.length < 3) {
        setSuggestions([]);
        setOpen(false);
      }
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const response = await fetch(
          `/api/maps/address-autocomplete?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          suggestions?: AddressSuggestion[];
        };
        const next = payload.suggestions ?? [];
        setSuggestions(next);
        setOpen(next.length > 0);
        setActiveIndex(next.length > 0 ? 0 : -1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, selectedFromSuggestion]);

  function selectSuggestion(suggestion: AddressSuggestion) {
    setSelectedFromSuggestion(true);
    setJustSelected(true);
    setQuery(suggestion.adresse);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    onChange({
      adresse: suggestion.adresse,
      codePostal: suggestion.codePostal,
      ville: suggestion.ville,
      pays: suggestion.pays || "France",
      selectedFromSuggestion: true,
    });
    window.setTimeout(() => setJustSelected(false), 450);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current < suggestions.length - 1 ? current + 1 : 0,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const suggestion =
        suggestions[activeIndex >= 0 ? activeIndex : 0] ?? null;
      if (suggestion) selectSuggestion(suggestion);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={wrapRef} className={cn("relative space-y-1.5", className)}>
      <Label>{label}</Label>
      <Input
        value={query}
        disabled={disabled}
        autoComplete="street-address"
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && suggestions.length > 0}
        aria-activedescendant={
          activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        aria-invalid={Boolean(error)}
        className={cn(
          "transition-all duration-200",
          error && "border-red-500/70",
          justSelected && "border-accent/50 ring-4 ring-accent/10",
        )}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setSelectedFromSuggestion(false);
          onChange({
            adresse: next,
            codePostal: value.codePostal,
            ville: value.ville,
            pays: value.pays,
            selectedFromSuggestion: false,
          });
        }}
        onFocus={() => {
          if (suggestions.length > 0 && !selectedFromSuggestion) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {loading ? (
        <p className="text-xs text-muted-foreground animate-pulse">
          Recherche d&apos;adresses…
        </p>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="address-autocomplete-list absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-card"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.label} role="presentation">
              <button
                type="button"
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors duration-150",
                  index === activeIndex
                    ? "bg-accent/[0.08] text-foreground"
                    : "hover:bg-card-hover",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
              >
                <span className="text-sm font-medium text-foreground">
                  {suggestion.adresse}
                </span>
                <span className="text-xs text-muted-foreground">
                  {suggestion.codePostal} {suggestion.ville}
                  {suggestion.pays ? ` · ${suggestion.pays}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="text-xs font-medium text-red-400">{error}</p>
      ) : requireSuggestion &&
        !selectedFromSuggestion &&
        query.trim().length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Sélectionnez une adresse dans la liste (↑↓ puis Entrée).
        </p>
      ) : justSelected ? (
        <p className="text-xs font-medium text-accent transition-opacity duration-200">
          ✓ Adresse renseignée
        </p>
      ) : null}
    </div>
  );
}

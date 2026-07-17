"use client";

import { useEffect, useId, useRef, useState } from "react";
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
};

export function AddressAutocomplete({
  value,
  onChange,
  disabled,
  error,
  label = "Adresse",
}: AddressAutocompleteProps) {
  const listId = useId();
  const [query, setQuery] = useState(value.adresse);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFromSuggestion, setSelectedFromSuggestion] = useState(
    Boolean(value.adresse && value.codePostal && value.ville),
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(value.adresse);
  }, [value.adresse]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
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
        setSuggestions(payload.suggestions ?? []);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query]);

  function selectSuggestion(suggestion: AddressSuggestion) {
    setSelectedFromSuggestion(true);
    setQuery(suggestion.adresse);
    setSuggestions([]);
    setOpen(false);
    onChange({
      adresse: suggestion.adresse,
      codePostal: suggestion.codePostal,
      ville: suggestion.ville,
      pays: suggestion.pays,
      selectedFromSuggestion: true,
    });
  }

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={query}
        disabled={disabled}
        autoComplete="street-address"
        placeholder="Ex. 18 Chemin des Lilas"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && suggestions.length > 0}
        aria-invalid={Boolean(error)}
        className={cn(error && "border-red-500/70")}
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
          if (suggestions.length > 0) setOpen(true);
        }}
      />
      {loading ? (
        <p className="text-xs text-muted-foreground">Recherche d&apos;adresses…</p>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-card"
        >
          {suggestions.map((suggestion) => (
            <li key={suggestion.label}>
              <button
                type="button"
                role="option"
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-card-hover"
                onClick={() => selectSuggestion(suggestion)}
              >
                <span className="text-sm font-medium text-foreground">
                  {suggestion.adresse}
                </span>
                <span className="text-xs text-muted-foreground">
                  {suggestion.codePostal} {suggestion.ville}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="text-xs font-medium text-red-400">{error}</p>
      ) : !selectedFromSuggestion && query.trim().length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Sélectionnez une adresse dans la liste pour continuer.
        </p>
      ) : null}
    </div>
  );
}

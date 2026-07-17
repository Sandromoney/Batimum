"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type OnboardingImageUploadProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  accept?: string;
};

export function OnboardingImageUpload({
  label,
  hint,
  value,
  onChange,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml",
}: OnboardingImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function handleFile(file: File | null) {
    if (!file) return;
    setError("");

    if (file.size > 2 * 1024 * 1024) {
      setError("Fichier trop volumineux (2 Mo maximum).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.onerror = () => {
      setError("Impossible de lire ce fichier.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {hint ? (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      ) : null}

      <div
        className={cn(
          "relative flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(15,23,42,0.12)] bg-[#f8faf8] p-4 transition-colors hover:border-primary/30",
          value && "border-solid bg-white",
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="max-h-24 max-w-full object-contain"
            />
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Supprimer l'image"
              onClick={() => onChange("")}
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="flex flex-col items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-6 w-6" />
            <span>Ajouter une image</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p className="text-xs font-medium text-red-400">{error}</p>
      ) : null}
    </section>
  );
}

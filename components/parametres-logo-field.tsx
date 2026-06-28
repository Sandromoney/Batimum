"use client";

import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";

export function ParametresLogoField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value?: string;
  onChange: (imageData: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      alert("Format non supporté. Utilisez une image PNG, JPG ou JPEG.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;
      if (typeof imageData !== "string") return;
      onChange(imageData);
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card-elevated/60 p-4 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card transition-opacity duration-200">
          {value ? (
            <img
              src={value}
              alt={label}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{hint}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Importer une image
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              disabled={!value}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

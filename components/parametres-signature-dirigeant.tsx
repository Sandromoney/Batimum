"use client";

import { useEffect, useState } from "react";
import { DevisSignatureCanvas } from "@/components/devis-signature-canvas";
import { Button } from "@/components/ui/button";

type ParametresSignatureDirigeantProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ParametresSignatureDirigeant({
  value,
  onChange,
}: ParametresSignatureDirigeantProps) {
  const [draft, setDraft] = useState<string | null>(value || null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(value || null);
  }, [value]);

  function handleSave() {
    onChange(draft ?? "");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Signature électronique dirigeant
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Dessinez votre signature une fois : elle apparaîtra automatiquement sur
          vos devis PDF.
        </p>
      </div>

      {value && value.startsWith("data:image") ? (
        <div className="rounded-xl border border-border/80 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Signature dirigeant enregistrée"
            className="mx-auto h-20 max-w-full object-contain"
          />
        </div>
      ) : null}

      <DevisSignatureCanvas onChange={setDraft} />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={handleSave}>
          Enregistrer la signature
        </Button>
        {saved ? (
          <span className="text-xs font-medium text-primary">Signature enregistrée</span>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import { X } from "lucide-react";
import { Button } from "./button";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          className="btp-modal-backdrop absolute inset-0 backdrop-blur-md"
          onClick={onClose}
          aria-hidden
        />
        <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/95 shadow-card ring-1 ring-border/40">
          <header className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card-elevated/30 px-6 py-5">
            <h2
              id="modal-title"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="overflow-y-auto px-6 py-6">{children}</div>
        </div>
      </div>
    </>
  );
}

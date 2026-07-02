"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type ParametresUnsavedChangesDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  saving?: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSaveAndQuit: () => void;
};

export function ParametresUnsavedChangesDialog({
  open,
  title = "Modifications non enregistrées",
  message,
  saving = false,
  onCancel,
  onDiscard,
  onSaveAndQuit,
}: ParametresUnsavedChangesDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <section className="space-y-5">
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onDiscard}
            disabled={saving}
          >
            Quitter sans enregistrer
          </Button>
          <Button type="button" onClick={onSaveAndQuit} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer et quitter"}
          </Button>
        </footer>
      </section>
    </Modal>
  );
}

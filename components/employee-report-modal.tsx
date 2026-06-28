"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export function EmployeeReportModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
}) {
  const [message, setMessage] = useState("");

  function handleClose() {
    setMessage("");
    onClose();
  }

  function handleSubmit() {
    if (!message.trim()) return;
    onSubmit(message.trim());
    setMessage("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Signaler un problème">
      <div className="space-y-4">
        <section>
          <Label>Message</Label>
          <Textarea
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Décrivez le problème rencontré sur le chantier ou la tâche…"
          />
        </section>
        <Button
          type="button"
          className="min-h-11 w-full sm:w-auto"
          onClick={handleSubmit}
          disabled={!message.trim()}
        >
          Envoyer le signalement
        </Button>
      </div>
    </Modal>
  );
}

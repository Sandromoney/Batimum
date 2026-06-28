"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  getEntrepriseSendGateTitle,
  type EntrepriseSendField,
  type EntrepriseSendGateContext,
} from "@/lib/entreprise-send-gate";

type EntrepriseSendGateModalProps = {
  open: boolean;
  onClose: () => void;
  missing: EntrepriseSendField[];
  context: EntrepriseSendGateContext;
  isFirstSend: boolean;
};

export function EntrepriseSendGateModal({
  open,
  onClose,
  missing,
  context,
  isFirstSend,
}: EntrepriseSendGateModalProps) {
  const router = useRouter();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={getEntrepriseSendGateTitle(context, isFirstSend)}
    >
      <section className="space-y-5">
        <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
            strokeWidth={1.75}
          />
          <div className="space-y-2 text-sm leading-6 text-muted-foreground">
            <p>
              {isFirstSend
                ? "Avant d'envoyer votre premier document au client, renseignez les informations obligatoires de votre entreprise."
                : "L'envoi est bloqué tant que les informations obligatoires ne sont pas complètes."}
            </p>
            <p className="font-medium text-foreground">
              Informations à compléter dans Paramètres :
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {missing.map((field) => (
                <li key={field.id}>{field.label}</li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button
            type="button"
            onClick={() => {
              onClose();
              router.push("/parametres");
            }}
          >
            Compléter les paramètres
          </Button>
        </footer>
      </section>
    </Modal>
  );
}

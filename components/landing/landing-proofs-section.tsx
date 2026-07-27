import { Check } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const PROOFS = [
  {
    title: "Devis plus rapides",
    text: "Structurez vos lots et envoyez un devis clair sans ressaisir les mêmes informations.",
  },
  {
    title: "Moins de ressaisie",
    text: "Clients, chantiers, devis et factures restent liés dans un seul fil d’activité.",
  },
  {
    title: "Chantiers mieux suivis",
    text: "Avancement, photos et consignes restent accessibles bureau comme terrain.",
  },
  {
    title: "Rentabilité plus claire",
    text: "Gardez une vue simple sur le prévu, le réalisé et la marge de vos affaires.",
  },
] as const;

export function LandingProofsSection() {
  return (
    <section className="lp-section" aria-label="Preuves immédiates">
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-proofs">
            {PROOFS.map((proof) => (
              <article key={proof.title} className="lp-proof">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <h2 className="lp-proof__title">{proof.title}</h2>
                <p className="lp-proof__text">{proof.text}</p>
              </article>
            ))}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

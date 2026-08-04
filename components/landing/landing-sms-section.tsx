import { Bell, CreditCard, MessageSquare, RefreshCw } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const ITEMS = [
  { label: "Confirmation de rendez-vous", Icon: MessageSquare },
  { label: "Rappel de chantier", Icon: Bell },
  { label: "Notification de facture", Icon: MessageSquare },
  { label: "Relance de paiement", Icon: RefreshCw },
  { label: "Lien de paiement", Icon: CreditCard },
  { label: "Rappel automatique après plusieurs jours", Icon: Bell },
] as const;

export function LandingSmsSection() {
  return (
    <section id="sms" className="lp-section" aria-labelledby="sms-title">
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Roadmap
            </span>
            <h2 id="sms-title" className="lp-title mt-5 max-w-3xl">
              Bientôt : les SMS automatiques Batimum.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Gardez vos clients informés sans multiplier les appels.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-roadmap-grid mt-12">
          {ITEMS.map((item, index) => {
            const Icon = item.Icon;
            return (
              <LandingReveal key={item.label} delay={index * 50}>
                <article className="lp-roadmap-card">
                  <Icon
                    className="lp-roadmap-card__icon"
                    size={18}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <h3>{item.label}</h3>
                </article>
              </LandingReveal>
            );
          })}
        </div>
        <p className="lp-soon-note mt-8">Fonctionnalité en préparation.</p>
      </div>
    </section>
  );
}

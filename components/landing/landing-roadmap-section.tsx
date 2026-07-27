import { LandingReveal } from "@/components/landing/landing-reveal";

const ITEMS = [
  {
    title: "Marges par devis et chantier",
    status: "Disponible",
    badge: "available",
  },
  {
    title: "Assistant vocal sur mobile",
    status: "Bientôt",
    badge: "soon",
  },
  {
    title: "SMS automatiques",
    status: "Bientôt",
    badge: "soon",
  },
  {
    title: "Marketplace BTP",
    status: "À venir",
    badge: "later",
  },
  {
    title: "Recrutement et sous-traitance",
    status: "À venir",
    badge: "later",
  },
] as const;

export function LandingRoadmapSection() {
  return (
    <section
      id="evolutions"
      className="lp-section lp-section--soft"
      aria-labelledby="roadmap-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <span className="lp-eyebrow">
            <span className="lp-eyebrow__dot" aria-hidden="true" />
            Évolutions
          </span>
          <h2 id="roadmap-title" className="lp-title mt-4 text-3xl sm:text-4xl">
            Batimum évolue avec les besoins du bâtiment.
          </h2>
          <p className="lp-subtitle mt-3 max-w-2xl">
            Les fonctions disponibles et les prochaines étapes restent clairement
            distinguées.
          </p>
        </LandingReveal>

        <div className="lp-roadmap mt-8 max-w-3xl">
          {ITEMS.map((item) => (
            <div key={item.title} className="lp-roadmap-item">
              <div className="font-medium text-[#101828]">{item.title}</div>
              <span
                className={
                  item.badge === "available"
                    ? "lp-badge lp-badge--available"
                    : item.badge === "soon"
                      ? "lp-badge lp-badge--soon"
                      : "lp-badge lp-badge--later"
                }
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

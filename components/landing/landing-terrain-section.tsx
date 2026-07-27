import {
  Briefcase,
  FileText,
  HardHat,
  MapPinned,
  Phone,
  Receipt,
  Users,
  CalendarDays,
  FolderKanban,
  TrendingUp,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const BUREAU = [
  { label: "Devis", Icon: FileText },
  { label: "Factures", Icon: Receipt },
  { label: "Clients", Icon: Users },
  { label: "Rentabilité", Icon: TrendingUp },
  { label: "Planning global", Icon: CalendarDays },
] as const;

const TERRAIN = [
  { label: "Planning du jour", Icon: CalendarDays },
  { label: "Consignes", Icon: HardHat },
  { label: "Documents", Icon: FolderKanban },
  { label: "Suivi chantier", Icon: MapPinned },
  { label: "Coordonnées client", Icon: Phone },
  { label: "Itinéraire", Icon: Briefcase },
] as const;

export function LandingTerrainSection() {
  return (
    <section
      id="bureau-terrain"
      className="lp-section lp-section--soft"
      aria-labelledby="terrain-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <h2 id="terrain-title" className="lp-title">
              Votre entreprise vous suit partout.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Depuis le bureau, organisez votre activité. Sur le terrain,
              retrouvez les informations utiles à chaque chantier.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-dual mt-12">
          <LandingReveal>
            <article className="lp-dual__card">
              <div className="lp-dual__label">Bureau</div>
              <h3 className="lp-dual__title">Pilotez l’activité</h3>
              <ul className="lp-dual__list">
                {BUREAU.map(({ label, Icon }) => (
                  <li key={label}>
                    <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </article>
          </LandingReveal>

          <div className="lp-dual__bridge" aria-hidden="true">
            <span />
          </div>

          <LandingReveal delay={100}>
            <article className="lp-dual__card lp-dual__card--field">
              <div className="lp-dual__label">Terrain</div>
              <h3 className="lp-dual__title">Agissez sur place</h3>
              <ul className="lp-dual__list">
                {TERRAIN.map(({ label, Icon }) => (
                  <li key={label}>
                    <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </article>
          </LandingReveal>
        </div>

        <LandingReveal delay={160}>
          <p className="lp-dual__message">
            Une seule solution, du bureau au chantier.
          </p>
        </LandingReveal>
      </div>
    </section>
  );
}

"use client";

import { useId, useState } from "react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { cn } from "@/lib/utils";

const METIERS = [
  {
    id: "plombier",
    label: "Plombier",
    focus: "Interventions techniques et rénovations sanitaires.",
    lots: ["Lot plomberie", "Lot chauffage", "Lot salle de bain"],
    examples: [
      "Remplacement chauffe-eau",
      "Rénovation salle de bain",
      "Dépannage fuite",
    ],
  },
  {
    id: "electricien",
    label: "Électricien",
    focus: "Mises aux normes, tableaux et éclairages.",
    lots: ["Lot électricité", "Lot éclairage", "Lot courant faible"],
    examples: [
      "Mise aux normes tableau",
      "Pose de luminaires",
      "Installation prises",
    ],
  },
  {
    id: "macon",
    label: "Maçon",
    focus: "Gros œuvre, ouvertures et reprises structurelles.",
    lots: ["Lot maçonnerie", "Lot fondations", "Lot façades"],
    examples: [
      "Création d’ouverture",
      "Reprise de mur",
      "Dalle béton",
    ],
  },
  {
    id: "couvreur",
    label: "Couvreur",
    focus: "Toitures, étanchéité et zinguerie.",
    lots: ["Lot couverture", "Lot zinguerie", "Lot étanchéité"],
    examples: [
      "Réfection de toiture",
      "Remplacement gouttières",
      "Traitement infiltration",
    ],
  },
  {
    id: "plaquiste",
    label: "Plaquiste",
    focus: "Cloisons, doublages et plafonds.",
    lots: ["Lot doublage", "Lot cloison", "Lot plafond"],
    examples: [
      "Cloisons distribution",
      "Doublage phonique",
      "Faux plafond",
    ],
  },
  {
    id: "carreleur",
    label: "Carreleur",
    focus: "Sols, murs et pièces humides.",
    lots: ["Lot carrelage", "Lot faïence", "Lot ragréage"],
    examples: [
      "Pose 25 m² de carrelage",
      "Faïence salle de bain",
      "Ragréage sol",
    ],
  },
  {
    id: "peintre",
    label: "Peintre",
    focus: "Finitions intérieures et extérieures.",
    lots: ["Lot peinture", "Lot préparation", "Lot finitions"],
    examples: [
      "Rafraîchissement appartement",
      "Peinture façade",
      "Préparation supports",
    ],
  },
  {
    id: "paysagiste",
    label: "Paysagiste",
    focus: "Aménagements extérieurs et entretien.",
    lots: ["Lot terrassement", "Lot plantations", "Lot arrosage"],
    examples: [
      "Création de massifs",
      "Pose de terrasse",
      "Clôture et portail",
    ],
  },
  {
    id: "climaticien",
    label: "Climaticien",
    focus: "Chauffage, climatisation et ventilation.",
    lots: ["Lot climatisation", "Lot VMC", "Lot chauffage"],
    examples: [
      "Pose split mural",
      "Installation VMC",
      "Entretien annuel",
    ],
  },
] as const;

export function LandingMetiersSection() {
  const [activeId, setActiveId] = useState<(typeof METIERS)[number]["id"]>(
    "plombier",
  );
  const baseId = useId();
  const active = METIERS.find((m) => m.id === activeId) ?? METIERS[0];
  const tablistId = `${baseId}-tabs`;
  const panelId = `${baseId}-panel`;

  return (
    <section
      id="metiers"
      className="lp-section lp-section--soft"
      aria-labelledby="metiers-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <h2 id="metiers-title" className="lp-title max-w-3xl">
              Pensé pour les métiers du bâtiment.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Batimum s’adapte à votre manière de travailler, quel que soit
              votre métier.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-metiers">
          <div
            className="lp-metiers__tabs"
            role="tablist"
            aria-label="Métiers du BTP"
            id={tablistId}
          >
            {METIERS.map((metier) => {
              const selected = metier.id === active.id;
              return (
                <button
                  key={metier.id}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${metier.id}`}
                  aria-selected={selected}
                  aria-controls={panelId}
                  tabIndex={selected ? 0 : -1}
                  className={cn(
                    "lp-metiers__tab",
                    selected && "is-active",
                  )}
                  onClick={() => setActiveId(metier.id)}
                >
                  {metier.label}
                </button>
              );
            })}
          </div>

          <LandingReveal key={active.id} delay={40}>
            <div
              className="lp-metiers__panel"
              role="tabpanel"
              id={panelId}
              aria-labelledby={`${baseId}-tab-${active.id}`}
            >
              <p className="lp-metiers__focus">{active.focus}</p>
              <div className="lp-metiers__columns">
                <div>
                  <h3 className="lp-metiers__col-title">Exemples de lots</h3>
                  <ul className="lp-metiers__chips">
                    {active.lots.map((lot) => (
                      <li key={lot}>{lot}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="lp-metiers__col-title">Exemples de chantiers</h3>
                  <ul className="lp-metiers__chips lp-metiers__chips--soft">
                    {active.examples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="lp-metiers__note">
                Même logique pour tous les métiers : devis, planning, chantier,
                facturation et pilotage restent connectés.
              </p>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}

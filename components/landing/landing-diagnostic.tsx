"use client";

import { LandingReveal } from "@/components/landing/landing-reveal";

export function LandingDiagnosticSection() {
  return (
    <section id="exclusivite" className="landing-section">
      <div className="landing-container">
        <LandingReveal variant="title">
          <header className="landing-section-header">
            <p className="landing-eyebrow">Espace employé</p>
            <h2 className="landing-h2">
              Ils voient le planning.
              <br />
              Pas vos <span className="landing-mark">chiffres</span>.
            </h2>
            <p className="landing-lead">
              Chaque salarié a son accès. Devis, factures et marges restent
              réservés au dirigeant.
            </p>
          </header>
        </LandingReveal>

        <LandingReveal delay={80}>
          <div className="landing-two-cols">
            <article className="landing-panel">
              <h3>Dirigeant</h3>
              <ul>
                <li>Clients, devis, factures</li>
                <li>Pilotage et rentabilité</li>
                <li>Paramètres entreprise</li>
              </ul>
            </article>
            <article className="landing-panel landing-panel--accent">
              <h3>Employé</h3>
              <ul>
                <li>Son planning</li>
                <li>Ses chantiers</li>
                <li>Consignes et contacts</li>
              </ul>
            </article>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}

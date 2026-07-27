export function LandingDesktopScreen() {
  return (
    <div className="lp-ui-desktop" aria-hidden="true">
      <aside className="lp-ui-desktop__nav">
        <div className="lp-ui-desktop__nav-logo" />
        <div className="lp-ui-desktop__nav-item is-active" />
        <div className="lp-ui-desktop__nav-item" />
        <div className="lp-ui-desktop__nav-item" />
        <div className="lp-ui-desktop__nav-item" />
        <div className="lp-ui-desktop__nav-item" />
        <div className="lp-ui-desktop__nav-item" />
      </aside>
      <div className="lp-ui-desktop__main">
        <div className="lp-ui-desktop__top">
          <div className="lp-ui-desktop__title">Tableau de bord</div>
          <div style={{ color: "#667085" }}>Aujourd&apos;hui</div>
        </div>
        <div className="lp-ui-desktop__kpi-row">
          <div className="lp-ui-desktop__kpi">
            <div className="lp-ui-desktop__kpi-label">Chiffre d&apos;affaires</div>
            <div className="lp-ui-desktop__kpi-value">48 200 €</div>
          </div>
          <div className="lp-ui-desktop__kpi">
            <div className="lp-ui-desktop__kpi-label">Devis en attente</div>
            <div className="lp-ui-desktop__kpi-value">7</div>
          </div>
          <div className="lp-ui-desktop__kpi">
            <div className="lp-ui-desktop__kpi-label">Factures payées</div>
            <div className="lp-ui-desktop__kpi-value is-green">12</div>
          </div>
          <div className="lp-ui-desktop__kpi">
            <div className="lp-ui-desktop__kpi-label">Marge</div>
            <div className="lp-ui-desktop__kpi-value is-green">31 %</div>
          </div>
        </div>
        <div className="lp-ui-desktop__panels">
          <div className="lp-ui-desktop__panel">
            <strong>Chantiers en cours</strong>
            <div style={{ marginTop: 6, color: "#667085" }}>
              Rénovation salle de bain · Lot plomberie
            </div>
            <div className="lp-ui-desktop__bar">
              <span style={{ width: "72%" }} />
            </div>
            <div style={{ marginTop: 8, color: "#667085" }}>
              Extension maison · Lot maçonnerie
            </div>
            <div className="lp-ui-desktop__bar">
              <span style={{ width: "44%" }} />
            </div>
          </div>
          <div className="lp-ui-desktop__panel">
            <strong>Planning</strong>
            <div style={{ marginTop: 6, color: "#667085" }}>3 équipes</div>
            <div style={{ marginTop: 6, color: "#667085" }}>2 retards signalés</div>
            <div style={{ marginTop: 6, color: "#059669" }}>Rentabilité suivie</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingMobileScreen() {
  return (
    <div className="lp-ui-mobile" aria-hidden="true">
      <div className="lp-ui-mobile__hello">Bonjour Anthony</div>
      <div className="lp-ui-mobile__card">
        <div style={{ fontWeight: 700 }}>Planning du jour</div>
        <div className="lp-ui-mobile__meta">1 chantier · 08:30 – 17:00</div>
      </div>
      <div className="lp-ui-mobile__card">
        <div style={{ fontWeight: 700 }}>Rénovation salle de bain</div>
        <div className="lp-ui-mobile__meta">12 rue des Lilas, Lyon</div>
        <div className="lp-ui-mobile__progress">
          <span />
        </div>
        <div className="lp-ui-mobile__steps" style={{ marginTop: 8 }}>
          <div className="lp-ui-mobile__step">
            <span className="lp-ui-mobile__dot is-done" /> Dépose
          </div>
          <div className="lp-ui-mobile__step">
            <span className="lp-ui-mobile__dot is-done" /> Plomberie
          </div>
          <div className="lp-ui-mobile__step">
            <span className="lp-ui-mobile__dot" /> Carrelage
          </div>
        </div>
      </div>
      <div className="lp-ui-mobile__card">
        <div style={{ fontWeight: 700 }}>Photos & consignes</div>
        <div className="lp-ui-mobile__photos" style={{ marginTop: 6 }}>
          <div className="lp-ui-mobile__photo" />
          <div className="lp-ui-mobile__photo" />
          <div className="lp-ui-mobile__photo" />
        </div>
        <div className="lp-ui-mobile__meta" style={{ marginTop: 6 }}>
          Vérifier l&apos;étanchéité avant carrelage.
        </div>
      </div>
      <div className="lp-ui-mobile__actions">
        <div className="lp-ui-mobile__btn lp-ui-mobile__btn--ghost">Appeler</div>
        <div className="lp-ui-mobile__btn lp-ui-mobile__btn--primary">Itinéraire</div>
      </div>
    </div>
  );
}

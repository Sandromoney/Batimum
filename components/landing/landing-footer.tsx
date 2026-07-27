import Link from "next/link";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { href: "/landing#fonctionnalites", label: "Fonctionnalités" },
      { href: "/landing#plans", label: "Tarifs" },
      { href: "/landing#sms", label: "Mises à jour" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { href: "/landing#faq", label: "Aide" },
      { href: "/landing#premiers-pas", label: "Guides" },
      { href: "mailto:contact@batimum.fr", label: "Contact" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { href: "/landing#temoignages", label: "À propos" },
      { href: "/landing#temoignages", label: "Témoignages" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/cgu", label: "CGU" },
      { href: "/cgv", label: "CGV" },
      { href: "/confidentialite", label: "Confidentialité" },
      { href: "/mentions-legales", label: "Mentions légales" },
    ],
  },
  {
    title: "Connexion",
    links: [
      { href: "/login", label: "Connexion" },
      { href: "/login-employe", label: "Connexion employé" },
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="lp-footer" aria-label="Pied de page Batimum">
      <div className="lp-container lp-footer__inner">
        <div className="lp-footer__brand">
          <Link href="/landing" className="lp-footer__logo-link no-underline" aria-label="Batimum">
            <img
              src="/logo-batimum.png"
              alt="Batimum"
              className="lp-footer__logo"
              width={115}
              height={29}
              decoding="async"
            />
          </Link>
          <p>
            La solution de gestion tout-en-un dédiée aux dirigeants
            d’entreprises du BTP.
          </p>
        </div>

        <div className="lp-footer__columns">
          {COLUMNS.map((column) => (
            <div key={column.title} className="lp-footer__col">
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link href={link.href} className="no-underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="lp-footer__bottom">
        <div className="lp-container">
          <p>© 2026 Batimum. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}

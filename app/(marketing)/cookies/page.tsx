import Link from "next/link";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal-page-layout";
import { LEGAL_COMPANY } from "@/lib/legal-constants";

export const metadata = {
  title: "Politique de cookies — Batimum",
  description: "Politique de cookies du service Batimum.",
};

export default function CookiesPage() {
  const c = LEGAL_COMPANY;

  return (
    <LegalPageLayout title="Politique de cookies">
      <p>
        La présente politique explique comment {c.name} utilise les cookies et
        technologies similaires lors de votre navigation sur le site et
        l&apos;application.
      </p>

      <LegalSection title="1. Qu'est-ce qu'un cookie ?">
        <p>
          Un cookie est un petit fichier texte déposé sur votre terminal
          (ordinateur, tablette, smartphone) lors de la visite d&apos;un site web.
          Il permet de stocker des informations relatives à votre navigation.
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies utilisés">
        <p>Nous utilisons les catégories de cookies suivantes :</p>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <p className="font-semibold text-foreground">
              Cookies strictement nécessaires
            </p>
            <p className="mt-2">
              Indispensables au fonctionnement du service (authentification,
              sécurité, préférences de session). Ils ne nécessitent pas votre
              consentement.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-4">
            <p className="font-semibold text-foreground">
              Cookies de performance
            </p>
            <p className="mt-2">
              Permettent de mesurer l&apos;audience et d&apos;améliorer les
              performances du service. [À compléter — outils analytics utilisés]
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-4">
            <p className="font-semibold text-foreground">
              Cookies de paiement
            </p>
            <p className="mt-2">
              Lors du processus d&apos;inscription, {c.payment} peut déposer des
              cookies nécessaires au traitement sécurisé du paiement.
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="3. Durée de conservation">
        <p>
          La durée de conservation des cookies varie selon leur type. Les
          cookies de session sont supprimés à la fermeture du navigateur. Les
          cookies persistants sont conservés pour une durée maximale de 13 mois.
        </p>
      </LegalSection>

      <LegalSection title="4. Gestion des cookies">
        <p>
          Vous pouvez à tout moment configurer votre navigateur pour accepter
          ou refuser les cookies. Le refus de certains cookies peut limiter
          l&apos;accès à certaines fonctionnalités du service.
        </p>
        <p>Voici les liens pour gérer les cookies selon votre navigateur :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary no-underline hover:underline"
            >
              Google Chrome
            </a>
          </li>
          <li>
            <a
              href="https://support.mozilla.org/fr/kb/activer-desactiver-cookies"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary no-underline hover:underline"
            >
              Mozilla Firefox
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary no-underline hover:underline"
            >
              Safari
            </a>
          </li>
          <li>
            <a
              href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary no-underline hover:underline"
            >
              Microsoft Edge
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Données personnelles">
        <p>
          Les informations collectées via les cookies peuvent constituer des
          données personnelles. Pour en savoir plus, consultez notre{" "}
          <Link
            href="/confidentialite"
            className="font-medium text-primary no-underline hover:underline"
          >
            Politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p>
          Pour toute question relative aux cookies, contactez-nous à {c.email}.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

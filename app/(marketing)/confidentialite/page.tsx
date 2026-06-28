import Link from "next/link";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal-page-layout";
import { LEGAL_COMPANY } from "@/lib/legal-constants";

export const metadata = {
  title: "Politique de confidentialité — Batimum",
  description: "Politique de confidentialité et protection des données Batimum.",
};

export default function ConfidentialitePage() {
  const c = LEGAL_COMPANY;

  return (
    <LegalPageLayout title="Politique de confidentialité">
      <p>
        La présente politique de confidentialité décrit comment {c.name},
        édité par {c.editor}, collecte, utilise et protège vos données
        personnelles conformément au Règlement Général sur la Protection des
        Données (RGPD) et à la loi Informatique et Libertés.
      </p>

      <LegalSection title="1. Responsable du traitement">
        <p>
          <strong className="text-foreground">Responsable :</strong> {c.editor}
        </p>
        <p>
          <strong className="text-foreground">Adresse :</strong> {c.address}
        </p>
        <p>
          <strong className="text-foreground">Email :</strong> {c.email}
        </p>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <p>Nous collectons les données suivantes :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Données d&apos;identification :</strong>{" "}
            nom, prénom, nom d&apos;entreprise, email, téléphone ;
          </li>
          <li>
            <strong className="text-foreground">Données de connexion :</strong>{" "}
            identifiants, logs de connexion, adresse IP ;
          </li>
          <li>
            <strong className="text-foreground">Données de facturation :</strong>{" "}
            informations d&apos;abonnement (traitées par {c.payment}, sans
            stockage des coordonnées bancaires par {c.name}) ;
          </li>
          <li>
            <strong className="text-foreground">Données métier :</strong>{" "}
            clients, devis, factures, chantiers et autres données saisies dans
            l&apos;application.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalités du traitement">
        <p>Les données sont traitées pour les finalités suivantes :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>création et gestion de votre compte utilisateur ;</li>
          <li>fourniture et amélioration du service ;</li>
          <li>gestion de l&apos;abonnement et de la facturation ;</li>
          <li>support client et communication ;</li>
          <li>respect des obligations légales et réglementaires ;</li>
          <li>sécurité et prévention de la fraude.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Base légale">
        <p>Les traitements reposent sur :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>l&apos;exécution du contrat (fourniture du service) ;</li>
          <li>le consentement (cookies non essentiels, le cas échéant) ;</li>
          <li>l&apos;intérêt légitime (sécurité, amélioration du service) ;</li>
          <li>les obligations légales applicables.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Destinataires des données">
        <p>Vos données peuvent être transmises à :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">{c.host}</strong> — hébergement
            de l&apos;application ;
          </li>
          <li>
            <strong className="text-foreground">{c.payment}</strong> — traitement
            des paiements ;
          </li>
          <li>
            nos sous-traitants techniques, dans la stricte limite de leurs
            missions ;
          </li>
          <li>
            les autorités compétentes, sur demande légale.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Durée de conservation">
        <p>
          Les données de compte sont conservées pendant la durée de la relation
          contractuelle, puis archivées conformément aux obligations légales.
        </p>
        <p>
          Les données de facturation sont conservées pendant la durée légale
          applicable (10 ans pour les documents comptables).
        </p>
        <p>
          Les données de connexion sont conservées pour une durée maximale de 12
          mois.
        </p>
      </LegalSection>

      <LegalSection title="7. Vos droits">
        <p>
          Conformément au RGPD, vous disposez des droits suivants sur vos
          données personnelles :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>droit d&apos;accès et de rectification ;</li>
          <li>droit à l&apos;effacement (« droit à l&apos;oubli ») ;</li>
          <li>droit à la limitation du traitement ;</li>
          <li>droit à la portabilité ;</li>
          <li>droit d&apos;opposition ;</li>
          <li>droit de retirer votre consentement à tout moment.</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez-nous à {c.email}. Vous pouvez
          également introduire une réclamation auprès de la CNIL (
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary no-underline hover:underline"
          >
            www.cnil.fr
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="8. Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles
          appropriées pour protéger vos données contre tout accès non autorisé,
          perte ou altération.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies">
        <p>
          Pour plus d&apos;informations sur l&apos;utilisation des cookies,
          consultez notre{" "}
          <Link
            href="/cookies"
            className="font-medium text-primary no-underline hover:underline"
          >
            Politique de cookies
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Modifications">
        <p>
          Cette politique peut être mise à jour. La date de dernière mise à jour
          sera indiquée en haut de cette page. Nous vous informerons de toute
          modification substantielle.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

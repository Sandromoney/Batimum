import Link from "next/link";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal-page-layout";
import { LEGAL_COMPANY } from "@/lib/legal-constants";

export const metadata = {
  title: "Conditions Générales d'Utilisation — Batimum",
  description: "CGU du service Batimum.",
};

export default function CguPage() {
  const c = LEGAL_COMPANY;

  return (
    <LegalPageLayout title="Conditions Générales d'Utilisation (CGU)">
      <p>
        Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU
        ») régissent l&apos;accès et l&apos;utilisation du service SaaS{" "}
        {c.name}, édité par {c.editor}, accessible via le site internet et
        l&apos;application web associée.
      </p>
      <p>
        En créant un compte ou en utilisant le service, l&apos;utilisateur
        accepte sans réserve les présentes CGU.
      </p>

      <LegalSection title="1. Objet">
        <p>
          {c.name} est un logiciel en ligne de gestion destiné aux artisans et
          entreprises du bâtiment. Il permet notamment la gestion de devis,
          factures, clients, chantiers et planning.
        </p>
      </LegalSection>

      <LegalSection title="2. Accès au service">
        <p>
          L&apos;accès au service nécessite la création d&apos;un compte
          utilisateur et une connexion internet. L&apos;éditeur s&apos;efforce
          d&apos;assurer une disponibilité continue du service, sans garantie
          d&apos;absence d&apos;interruption.
        </p>
        <p>
          Un essai gratuit de {c.trialDays} est proposé lors de
          l&apos;inscription, sous réserve de fournir un moyen de paiement valide
          via {c.payment}.
        </p>
      </LegalSection>

      <LegalSection title="3. Compte utilisateur">
        <p>
          L&apos;utilisateur s&apos;engage à fournir des informations exactes et
          à jour lors de son inscription. Il est seul responsable de la
          confidentialité de ses identifiants et de toute activité réalisée via
          son compte.
        </p>
        <p>
          En cas d&apos;usage frauduleux ou non conforme, l&apos;éditeur se
          réserve le droit de suspendre ou supprimer le compte concerné.
        </p>
      </LegalSection>

      <LegalSection title="4. Utilisation autorisée">
        <p>
          L&apos;utilisateur s&apos;engage à utiliser le service de manière
          conforme à la législation en vigueur et aux présentes CGU. Sont
          notamment interdits :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>l&apos;usage du service à des fins illicites ;</li>
          <li>
            toute tentative d&apos;accès non autorisé aux systèmes ou données ;
          </li>
          <li>
            la reproduction, modification ou extraction massive des contenus du
            service ;
          </li>
          <li>la revente ou la sous-licence du service sans autorisation.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Données et confidentialité">
        <p>
          Le traitement des données personnelles est décrit dans notre{" "}
          <Link
            href="/confidentialite"
            className="font-medium text-primary no-underline hover:underline"
          >
            Politique de confidentialité
          </Link>
          .
        </p>
        <p>
          L&apos;utilisateur reste propriétaire des données qu&apos;il saisit
          dans le service. L&apos;éditeur n&apos;en fait usage que pour la
          fourniture et l&apos;amélioration du service.
        </p>
      </LegalSection>

      <LegalSection title="6. Propriété intellectuelle">
        <p>
          Le service, son architecture, ses interfaces, ses marques et
          contenus restent la propriété exclusive de l&apos;éditeur. Aucune
          cession de droits de propriété intellectuelle n&apos;est opérée au
          profit de l&apos;utilisateur.
        </p>
      </LegalSection>

      <LegalSection title="7. Responsabilité">
        <p>
          Le service est fourni « en l&apos;état ». L&apos;éditeur ne saurait
          être tenu responsable des dommages indirects, pertes de données ou
          pertes d&apos;exploitation résultant de l&apos;utilisation du service.
        </p>
        <p>
          L&apos;utilisateur est seul responsable des documents (devis,
          factures, etc.) générés via le service et de leur conformité
          réglementaire.
        </p>
      </LegalSection>

      <LegalSection title="8. Résiliation">
        <p>
          L&apos;utilisateur peut résilier son abonnement à tout moment depuis
          son espace ou en contactant le support. La résiliation peut être
          effectuée avant la fin de la période d&apos;essai gratuit de{" "}
          {c.trialDays} afin d&apos;éviter tout prélèvement.
        </p>
        <p>
          L&apos;éditeur peut suspendre ou résilier l&apos;accès en cas de
          manquement grave aux présentes CGU.
        </p>
      </LegalSection>

      <LegalSection title="9. Modification des CGU">
        <p>
          L&apos;éditeur se réserve le droit de modifier les présentes CGU à
          tout moment. Les utilisateurs seront informés des modifications
          substantielles. La poursuite de l&apos;utilisation du service vaut
          acceptation des CGU mises à jour.
        </p>
      </LegalSection>

      <LegalSection title="10. Droit applicable">
        <p>
          Les présentes CGU sont soumises au droit français. En cas de litige,
          et à défaut de résolution amiable, les tribunaux compétents seront
          ceux du ressort du siège social de l&apos;éditeur.
        </p>
        <p>
          <strong className="text-foreground">Contact :</strong> {c.email}
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

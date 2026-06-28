import Link from "next/link";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal-page-layout";
import { LEGAL_COMPANY } from "@/lib/legal-constants";

export const metadata = {
  title: "Conditions Générales de Vente — Batimum",
  description: "CGV du service Batimum.",
};

export default function CgvPage() {
  const c = LEGAL_COMPANY;

  return (
    <LegalPageLayout title="Conditions Générales de Vente (CGV)">
      <p>
        Les présentes Conditions Générales de Vente (ci-après « CGV »)
        s&apos;appliquent à toute souscription à l&apos;abonnement du service{" "}
        {c.name}, édité par {c.editor}.
      </p>

      <LegalSection title="1. Vendeur">
        <p>
          <strong className="text-foreground">Raison sociale :</strong> {c.name}
        </p>
        <p>
          <strong className="text-foreground">SIRET :</strong> {c.siret}
        </p>
        <p>
          <strong className="text-foreground">Adresse :</strong> {c.address}
        </p>
        <p>
          <strong className="text-foreground">Email :</strong> {c.email}
        </p>
      </LegalSection>

      <LegalSection title="2. Objet">
        <p>
          Les présentes CGV définissent les conditions de vente de
          l&apos;abonnement au service {c.name}, logiciel SaaS de gestion pour
          les professionnels du bâtiment.
        </p>
      </LegalSection>

      <LegalSection title="3. Offre et tarifs">
        <p>
          L&apos;abonnement est proposé au tarif de{" "}
          <strong className="text-foreground">{c.subscriptionPrice}</strong>,
          facturé mensuellement.
        </p>
        <p>
          Un essai gratuit de <strong className="text-foreground">{c.trialDays}</strong>{" "}
          est offert à toute nouvelle souscription. Une carte bancaire valide est
          requise pour activer l&apos;essai.
        </p>
        <p>
          Les tarifs en vigueur sont ceux affichés sur le site au moment de la
          souscription. L&apos;éditeur se réserve le droit de modifier ses
          tarifs, sous réserve d&apos;en informer les abonnés avant
          application.
        </p>
      </LegalSection>

      <LegalSection title="4. Commande et souscription">
        <p>
          La souscription s&apos;effectue en ligne via le formulaire
          d&apos;inscription. L&apos;utilisateur doit accepter les{" "}
          <Link
            href="/cgu"
            className="font-medium text-primary no-underline hover:underline"
          >
            CGU
          </Link>{" "}
          et les présentes CGV pour valider sa commande.
        </p>
        <p>
          Le paiement est traité de manière sécurisée par{" "}
          <strong className="text-foreground">{c.payment}</strong>. Aucune
          donnée bancaire n&apos;est stockée par {c.name}.
        </p>
      </LegalSection>

      <LegalSection title="5. Période d'essai">
        <p>
          L&apos;essai gratuit de {c.trialDays} débute à l&apos;activation du
          compte. Aucun prélèvement n&apos;est effectué pendant cette période,
          sous réserve que l&apos;utilisateur n&apos;ait pas résilié avant son
          terme.
        </p>
        <p>
          À l&apos;issue de l&apos;essai, l&apos;abonnement est automatiquement
          renouvelé au tarif mensuel en vigueur, sauf résiliation préalable par
          l&apos;utilisateur.
        </p>
      </LegalSection>

      <LegalSection title="6. Paiement">
        <p>
          Le règlement s&apos;effectue par carte bancaire via {c.payment}, de
          manière récurrente et automatique à chaque échéance mensuelle.
        </p>
        <p>
          En cas d&apos;échec de paiement, l&apos;accès au service pourra être
          suspendu jusqu&apos;à régularisation.
        </p>
      </LegalSection>

      <LegalSection title="7. Droit de rétractation">
        <p>
          Conformément à l&apos;article L221-28 du Code de la consommation, le
          droit de rétractation ne s&apos;applique pas aux contrats de fourniture
          de contenu numérique non fourni sur un support matériel dont
          l&apos;exécution a commencé avec l&apos;accord du consommateur.
        </p>
        <p>
          L&apos;utilisateur professionnel bénéficie néanmoins de la possibilité
          de résilier son abonnement avant la fin de la période d&apos;essai
          gratuit afin d&apos;éviter tout prélèvement.
        </p>
      </LegalSection>

      <LegalSection title="8. Résiliation">
        <p>
          L&apos;abonnement est sans engagement. L&apos;utilisateur peut
          résilier à tout moment depuis son espace client ou en contactant le
          support à {c.email}.
        </p>
        <p>
          La résiliation prend effet à la fin de la période de facturation en
          cours. Aucun remboursement au prorata n&apos;est effectué pour la
          période entamée.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsabilité">
        <p>
          L&apos;éditeur s&apos;engage à fournir le service avec diligence.
          Sa responsabilité est limitée au montant des sommes versées par
          l&apos;utilisateur au cours des douze (12) derniers mois.
        </p>
      </LegalSection>

      <LegalSection title="10. Données personnelles">
        <p>
          Les données collectées dans le cadre de la souscription sont traitées
          conformément à notre{" "}
          <Link
            href="/confidentialite"
            className="font-medium text-primary no-underline hover:underline"
          >
            Politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Litiges">
        <p>
          Les présentes CGV sont soumises au droit français. En cas de litige,
          une solution amiable sera recherchée avant toute action judiciaire.
        </p>
        <p>
          <strong className="text-foreground">Contact :</strong> {c.email}
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

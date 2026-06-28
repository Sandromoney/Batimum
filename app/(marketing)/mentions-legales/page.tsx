import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal-page-layout";
import { LEGAL_COMPANY } from "@/lib/legal-constants";

export const metadata = {
  title: "Mentions légales — Batimum",
  description: "Mentions légales du service Batimum.",
};

export default function MentionsLegalesPage() {
  const c = LEGAL_COMPANY;

  return (
    <LegalPageLayout title="Mentions légales">
      <p>
        Conformément aux dispositions des articles 6-III et 19 de la loi n°
        2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie
        numérique, les présentes mentions légales s&apos;appliquent au site et
        au service {c.name}.
      </p>

      <LegalSection title="Éditeur du site">
        <p>
          <strong className="text-foreground">Raison sociale :</strong> {c.name}
        </p>
        <p>
          <strong className="text-foreground">Responsable de publication :</strong>{" "}
          {c.editor}
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

      <LegalSection title="Hébergement">
        <p>
          Le site et l&apos;application sont hébergés par{" "}
          <strong className="text-foreground">{c.host}</strong>.
        </p>
        <p>
          Vercel Inc. — 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments composant le service {c.name} (textes,
          graphismes, logiciels, photographies, images, vidéos, sons, plans,
          noms, logos, marques, créations et œuvres diverses, bases de données,
          etc.) est protégé par le droit de la propriété intellectuelle.
        </p>
        <p>
          Toute reproduction, représentation, modification, publication ou
          adaptation de tout ou partie des éléments du service, quel que soit
          le moyen ou le procédé utilisé, est interdite sans autorisation
          écrite préalable de l&apos;éditeur.
        </p>
      </LegalSection>

      <LegalSection title="Limitation de responsabilité">
        <p>
          L&apos;éditeur s&apos;efforce d&apos;assurer l&apos;exactitude et la
          mise à jour des informations diffusées sur le service. Toutefois, il ne
          saurait garantir l&apos;exactitude, la précision ou l&apos;exhaustivité
          des informations mises à disposition.
        </p>
        <p>
          L&apos;utilisateur reconnaît utiliser ces informations sous sa
          responsabilité exclusive.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question relative au service ou aux présentes mentions
          légales, vous pouvez nous contacter à l&apos;adresse suivante :{" "}
          {c.email}.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

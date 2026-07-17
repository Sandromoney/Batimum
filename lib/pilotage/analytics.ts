import {
  buildChantiersRentabilite,
  computeTimeEntryHeures,
  resolveChantierHeuresPrevues,
  resolveChantierTauxHoraireInterne,
} from "@/lib/pilotage/calculations";
import { computeEntryCoutMainOeuvre } from "@/lib/pilotage/employe-cout";
import {
  getCategoriePilotageLabel,
  resolveChantierCategoriePilotage,
} from "@/lib/pilotage/categories";
import type {
  AppData,
  CategoriePilotageChantier,
  ChantierTimeEntry,
  Employe,
} from "@/lib/types";

export type EmployePerformanceResume = {
  employe: Employe;
  heuresTravaillees: number;
  chantiersRealises: number;
  heuresPrevuesSurChantiers: number;
  ecartMoyenHeures: number;
  chantiersRentables: number;
  chantiersNonRentables: number;
  meilleurType?: CategoriePilotageChantier;
  typePlusDeDepassement?: CategoriePilotageChantier;
};

export type TypeChantierAnalyseResume = {
  categorie: CategoriePilotageChantier;
  label: string;
  nombreChantiers: number;
  caTotalHT: number;
  margeMoyenne: number;
  rentabiliteMoyenne: number;
  tempsMoyenPrevu: number;
  tempsMoyenReel: number;
  ecartMoyenHeures: number;
  donneeAConfirmer: boolean;
};

function groupEntriesByEmploye(entries: ChantierTimeEntry[]) {
  const map = new Map<string, ChantierTimeEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.employeId) ?? [];
    list.push(entry);
    map.set(entry.employeId, list);
  }
  return map;
}

export function computeEmployePerformance(
  data: AppData,
): EmployePerformanceResume[] {
  const entries = data.chantierTimeEntries ?? [];
  const classements = buildChantiersRentabilite(data);
  const byEmploye = groupEntriesByEmploye(entries);

  return data.employes
    .filter((employe) => employe.statut !== "desactive")
    .map((employe) => {
      const employeEntries = byEmploye.get(employe.id) ?? [];
      const chantierIds = new Set(employeEntries.map((entry) => entry.chantierId));
      const heuresTravaillees = employeEntries.reduce(
        (sum, entry) => sum + computeTimeEntryHeures(entry),
        0,
      );

      let heuresPrevuesSurChantiers = 0;
      let ecartTotal = 0;
      let chantiersRentables = 0;
      let chantiersNonRentables = 0;

      const efficaciteParType = new Map<CategoriePilotageChantier, number[]>();
      const depassementParType = new Map<CategoriePilotageChantier, number[]>();

      for (const chantierId of chantierIds) {
        const item = classements.find((row) => row.chantier.id === chantierId);
        if (!item) continue;

        const prevu = resolveChantierHeuresPrevues(item.chantier, item.devis);
        const reelEmploye = employeEntries
          .filter((entry) => entry.chantierId === chantierId)
          .reduce((sum, entry) => sum + computeTimeEntryHeures(entry), 0);

        heuresPrevuesSurChantiers += prevu;
        if (prevu > 0) {
          ecartTotal += reelEmploye - prevu * (reelEmploye / Math.max(item.rentabilite.tempsReelHeures, reelEmploye, 1));
        }

        if (item.rentabilite.margeReelle >= 0) chantiersRentables += 1;
        else chantiersNonRentables += 1;

        const categorie = resolveChantierCategoriePilotage(item.chantier, item.devis);
        const efficacite =
          item.rentabilite.tempsReelHeures > 0
            ? prevu / item.rentabilite.tempsReelHeures
            : 1;
        const depassement =
          prevu > 0
            ? (item.rentabilite.tempsReelHeures - prevu) / prevu
            : 0;

        efficaciteParType.set(categorie, [
          ...(efficaciteParType.get(categorie) ?? []),
          efficacite,
        ]);
        depassementParType.set(categorie, [
          ...(depassementParType.get(categorie) ?? []),
          depassement,
        ]);
      }

      const ecartMoyenHeures =
        chantierIds.size > 0
          ? Math.round((ecartTotal / chantierIds.size) * 100) / 100
          : 0;

      let meilleurType: CategoriePilotageChantier | undefined;
      let bestEfficacite = -Infinity;
      for (const [type, values] of efficaciteParType) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        if (avg > bestEfficacite) {
          bestEfficacite = avg;
          meilleurType = type;
        }
      }

      let typePlusDeDepassement: CategoriePilotageChantier | undefined;
      let worstDepassement = -Infinity;
      for (const [type, values] of depassementParType) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        if (avg > worstDepassement) {
          worstDepassement = avg;
          typePlusDeDepassement = type;
        }
      }

      return {
        employe,
        heuresTravaillees: Math.round(heuresTravaillees * 100) / 100,
        chantiersRealises: chantierIds.size,
        heuresPrevuesSurChantiers: Math.round(heuresPrevuesSurChantiers * 100) / 100,
        ecartMoyenHeures,
        chantiersRentables,
        chantiersNonRentables,
        meilleurType,
        typePlusDeDepassement,
      };
    })
    .filter((row) => row.heuresTravaillees > 0 || row.chantiersRealises > 0);
}

export function computeAnalyseParTypeChantier(
  data: AppData,
): TypeChantierAnalyseResume[] {
  const classements = buildChantiersRentabilite(data);
  const buckets = new Map<CategoriePilotageChantier, typeof classements>();

  for (const item of classements) {
    const categorie = resolveChantierCategoriePilotage(item.chantier, item.devis);
    buckets.set(categorie, [...(buckets.get(categorie) ?? []), item]);
  }

  return [...buckets.entries()]
    .map(([categorie, items]) => {
      const count = items.length;
      const caTotalHT = items.reduce(
        (sum, item) => sum + item.rentabilite.prixVenteHT,
        0,
      );
      const margeMoyenne =
        count > 0
          ? items.reduce((sum, item) => sum + item.rentabilite.margeReelle, 0) / count
          : 0;
      const rentabiliteMoyenne =
        count > 0
          ? items.reduce((sum, item) => sum + item.rentabilite.tauxMargeReelle, 0) /
            count
          : 0;
      const tempsMoyenPrevu =
        count > 0
          ? items.reduce((sum, item) => sum + item.rentabilite.tempsPrevuHeures, 0) /
            count
          : 0;
      const tempsMoyenReel =
        count > 0
          ? items.reduce((sum, item) => sum + item.rentabilite.tempsReelHeures, 0) /
            count
          : 0;
      const ecartMoyenHeures = tempsMoyenReel - tempsMoyenPrevu;

      return {
        categorie,
        label: getCategoriePilotageLabel(categorie),
        nombreChantiers: count,
        caTotalHT: Math.round(caTotalHT * 100) / 100,
        margeMoyenne: Math.round(margeMoyenne * 100) / 100,
        rentabiliteMoyenne: Math.round(rentabiliteMoyenne * 100) / 100,
        tempsMoyenPrevu: Math.round(tempsMoyenPrevu * 100) / 100,
        tempsMoyenReel: Math.round(tempsMoyenReel * 100) / 100,
        ecartMoyenHeures: Math.round(ecartMoyenHeures * 100) / 100,
        donneeAConfirmer: count < 2,
      };
    })
    .sort((a, b) => b.rentabiliteMoyenne - a.rentabiliteMoyenne);
}

export function getTypeChantierLePlusRentable(
  analyses: TypeChantierAnalyseResume[],
): TypeChantierAnalyseResume | undefined {
  return analyses[0];
}

export function getTypeChantierLeMoinsRentable(
  analyses: TypeChantierAnalyseResume[],
): TypeChantierAnalyseResume | undefined {
  if (analyses.length === 0) return undefined;
  return analyses[analyses.length - 1];
}

export function getTypeChantierLePlusRapide(
  analyses: TypeChantierAnalyseResume[],
): TypeChantierAnalyseResume | undefined {
  const pool = analyses.filter(
    (item) => item.nombreChantiers >= 2 && item.tempsMoyenPrevu > 0,
  );
  if (pool.length === 0) return undefined;
  return [...pool].sort((a, b) => a.ecartMoyenHeures - b.ecartMoyenHeures)[0];
}

export type EmployeEfficaciteResume = {
  employe: Employe;
  heuresTravaillees: number;
  coutReelEstime: number;
  chantiersRealises: number;
  meilleurType?: CategoriePilotageChantier;
  meilleurTypeLabel: string;
  ecartTempsPctMoyen: number;
  margeMoyenneChantiers: number;
  contributionRentable: string;
};

/** Domaines d'efficacité par employé — sans classement agressif. */
export function computeEmployeEfficaciteDomains(
  data: AppData,
): EmployeEfficaciteResume[] {
  const entries = data.chantierTimeEntries ?? [];
  const classements = buildChantiersRentabilite(data);
  const entrepriseTauxDefaut = data.parametres.tauxHoraireInterneDefaut;
  const byEmploye = groupEntriesByEmploye(entries);

  return data.employes
    .filter((employe) => employe.statut !== "desactive")
    .flatMap((employe) => {
      const employeEntries = byEmploye.get(employe.id) ?? [];
      const chantierIds = new Set(employeEntries.map((entry) => entry.chantierId));
      const heuresTravaillees = employeEntries.reduce(
        (sum, entry) => sum + computeTimeEntryHeures(entry),
        0,
      );

      let coutReelEstime = 0;
      const efficaciteParType = new Map<CategoriePilotageChantier, number[]>();
      const ecartsPct: number[] = [];
      let chantiersRentables = 0;

      for (const chantierId of chantierIds) {
        const item = classements.find((row) => row.chantier.id === chantierId);
        if (!item) continue;

        const reelEmploye = employeEntries
          .filter((entry) => entry.chantierId === chantierId)
          .reduce((sum, entry) => sum + computeTimeEntryHeures(entry), 0);

        const chantierTaux = resolveChantierTauxHoraireInterne(
          item.chantier,
          item.devis,
          entrepriseTauxDefaut,
        );
        coutReelEstime += computeEntryCoutMainOeuvre(reelEmploye, employe, {
          chantierTauxHoraire: chantierTaux > 0 ? chantierTaux : undefined,
          entrepriseTauxDefaut,
        });

        const prevu = resolveChantierHeuresPrevues(item.chantier, item.devis);
        if (prevu > 0 && item.rentabilite.tempsReelHeures > 0) {
          const partEmploye =
            reelEmploye / Math.max(item.rentabilite.tempsReelHeures, reelEmploye);
          const prevuEmploye = prevu * partEmploye;
          if (prevuEmploye > 0) {
            ecartsPct.push(((reelEmploye - prevuEmploye) / prevuEmploye) * 100);
          }
        }

        if (item.rentabilite.margeReelle >= 0) chantiersRentables += 1;

        const categorie = resolveChantierCategoriePilotage(
          item.chantier,
          item.devis,
        );
        const efficacite =
          prevu > 0 && reelEmploye > 0
            ? prevu / reelEmploye
            : 0;
        if (efficacite > 0) {
          efficaciteParType.set(categorie, [
            ...(efficaciteParType.get(categorie) ?? []),
            efficacite,
          ]);
        }
      }

      let meilleurType: CategoriePilotageChantier | undefined;
      let meilleurScore = -Infinity;
      for (const [type, values] of efficaciteParType) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        if (avg > meilleurScore) {
          meilleurScore = avg;
          meilleurType = type;
        }
      }

      const meilleurTypeLabel = meilleurType
        ? getCategoriePilotageLabel(meilleurType)
        : employe.specialitePrincipale?.trim() ||
          employe.poste?.trim() ||
          "Polyvalent";

      const margeItems = classements.filter((item) =>
        chantierIds.has(item.chantier.id),
      );
      const margeMoyenneChantiers =
        margeItems.length > 0
          ? margeItems.reduce(
              (sum, item) => sum + item.rentabilite.tauxMargeReelle,
              0,
            ) / margeItems.length
          : 0;

      const ecartTempsPctMoyen =
        ecartsPct.length > 0
          ? ecartsPct.reduce((sum, value) => sum + value, 0) / ecartsPct.length
          : 0;

      const contributionRentable =
        chantierIds.size > 0
          ? `${chantiersRentables} chantier${chantiersRentables > 1 ? "s" : ""} rentable${chantiersRentables > 1 ? "s" : ""} sur ${chantierIds.size} (contribution chantier)`
          : "Aucun chantier pointé";

      if (heuresTravaillees <= 0 && chantierIds.size === 0) {
        return [];
      }

      return [
        {
          employe,
          heuresTravaillees: Math.round(heuresTravaillees * 100) / 100,
          coutReelEstime: Math.round(coutReelEstime * 100) / 100,
          chantiersRealises: chantierIds.size,
          meilleurType,
          meilleurTypeLabel,
          ecartTempsPctMoyen: Math.round(ecartTempsPctMoyen * 100) / 100,
          margeMoyenneChantiers: Math.round(margeMoyenneChantiers * 100) / 100,
          contributionRentable,
        },
      ];
    })
    .sort((a, b) =>
      `${a.employe.prenom} ${a.employe.nom}`.localeCompare(
        `${b.employe.prenom} ${b.employe.nom}`,
        "fr",
      ),
    );
}

export type EmployeExcellenceResume = EmployeEfficaciteResume;

/** @deprecated Utiliser computeEmployeEfficaciteDomains */
export function computeEmployeExcellenceDomains(
  data: AppData,
): EmployeEfficaciteResume[] {
  return computeEmployeEfficaciteDomains(data);
}

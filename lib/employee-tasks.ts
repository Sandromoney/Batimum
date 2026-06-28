import { appendChantierHistorique } from "@/lib/chantier-statut";
import type { EmployeeTaskStatus } from "@/lib/employee-planning";
import { getPlanningEventDisplayTitle } from "@/lib/planning-types";
import type { AppData, EvenementPlanning } from "@/lib/types";
import { generateId } from "@/lib/utils";

function patchEmployeeTaskStatus(
  event: EvenementPlanning,
  employeId: string,
  status: EmployeeTaskStatus,
): EvenementPlanning {
  const termineIds = new Set(event.employeTermineIds ?? []);
  const enCoursIds = new Set(event.employeEnCoursIds ?? []);

  termineIds.delete(employeId);
  enCoursIds.delete(employeId);

  if (status === "termine") {
    termineIds.add(employeId);
  } else if (status === "en_cours") {
    enCoursIds.add(employeId);
  }

  return {
    ...event,
    employeTermineIds: [...termineIds],
    employeEnCoursIds: [...enCoursIds],
  };
}

export function applyEmployeeTaskStatus(
  data: AppData,
  eventId: string,
  employeId: string,
  employeName: string,
  status: EmployeeTaskStatus,
): AppData {
  const event = data.planning.find((item) => item.id === eventId);
  if (!event) return data;

  const updatedEvent = patchEmployeeTaskStatus(event, employeId, status);
  const chantier = updatedEvent.chantierId
    ? data.chantiers.find((item) => item.id === updatedEvent.chantierId)
    : undefined;

  let chantiers = data.chantiers;

  if (status === "termine" && chantier) {
    const title = getPlanningEventDisplayTitle(updatedEvent, chantier);
    const updatedChantier = appendChantierHistorique(chantier, {
      type: "intervention_terminee",
      label: `${employeName} a terminé : ${title}`,
      meta: {
        planningId: updatedEvent.id,
        employeId,
        date: updatedEvent.date,
      },
    });
    chantiers = data.chantiers.map((item) =>
      item.id === updatedChantier.id ? updatedChantier : item,
    );
  }

  return {
    ...data,
    chantiers,
    planning: data.planning.map((item) =>
      item.id === eventId ? updatedEvent : item,
    ),
  };
}

export function reportEmployeeProblem(
  data: AppData,
  eventId: string,
  employeId: string,
  message: string,
): AppData {
  return {
    ...data,
    planning: data.planning.map((event) =>
      event.id === eventId
        ? {
            ...event,
            employeProblemes: [
              ...(event.employeProblemes ?? []),
              {
                id: generateId(),
                employeId,
                message: message.trim(),
                dateCreation: new Date().toISOString(),
              },
            ],
          }
        : event,
    ),
  };
}

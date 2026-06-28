"use client";

import { useMemo } from "react";
import type { EmployeeTaskStatus } from "@/lib/employee-planning";
import {
  buildEmployeeTaskContext,
  getEmployeeAssignedEvents,
} from "@/lib/employee-planning";
import { applyEmployeeTaskStatus, reportEmployeeProblem } from "@/lib/employee-tasks";
import { useEmployeeSession } from "@/lib/hooks/use-employee-session";
import { useStore } from "@/lib/store";
import { employeDisplayLabel } from "@/lib/employee-access";

export function useEmployeeTasks() {
  const { data, setData } = useStore();
  const { employeId, employe, displayName } = useEmployeeSession();

  const assignedEvents = useMemo(
    () => getEmployeeAssignedEvents(data.planning, employeId),
    [data.planning, employeId],
  );

  const contexts = useMemo(
    () =>
      assignedEvents.map((event) =>
        buildEmployeeTaskContext(event, data, employeId),
      ),
    [assignedEvents, data, employeId],
  );

  function updateTaskStatus(eventId: string, status: EmployeeTaskStatus) {
    if (!employeId) return;
    const name = employe ? employeDisplayLabel(employe) : displayName;
    setData((previous) =>
      applyEmployeeTaskStatus(previous, eventId, employeId, name, status),
    );
  }

  function reportProblem(eventId: string, message: string) {
    if (!employeId || !message.trim()) return;
    setData((previous) =>
      reportEmployeeProblem(previous, eventId, employeId, message),
    );
  }

  return {
    data,
    employeId,
    employe,
    displayName,
    assignedEvents,
    contexts,
    updateTaskStatus,
    reportProblem,
  };
}

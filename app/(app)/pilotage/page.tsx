"use client";

import { PageHeader } from "@/components/page-header";
import { PilotageDashboardView } from "@/components/pilotage/pilotage-dashboard-view";

export default function PilotagePage() {
  return (
    <div className="btp-app-page mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Pilotage"
        description="Le cœur décisionnel de votre entreprise — rentabilité, équipes, chantiers et alertes."
      />
      <PilotageDashboardView />
    </div>
  );
}

"use client";

import { BibliothequeComparatifView } from "@/components/bibliotheque-comparatif-view";
import { BibliothequeFournisseursView } from "@/components/bibliotheque-fournisseurs-view";
import { BibliothequeProduitsView } from "@/components/bibliotheque-produits-view";
import { PageHeader } from "@/components/page-header";
import { getAccount } from "@/lib/account";
import { syncBibliothequeFromPriceLibrary } from "@/lib/entreprise-price-library/normalize";
import { useStore } from "@/lib/store";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type FournitureTab = "fournisseurs" | "produits" | "comparatif";

const TABS: Array<{ id: FournitureTab; label: string }> = [
  { id: "fournisseurs", label: "Fournisseurs" },
  { id: "produits", label: "Produits" },
  { id: "comparatif", label: "Comparatif de prix" },
];

function parseInitialTab(value: string | null): FournitureTab {
  if (value === "comparatif") return "comparatif";
  if (value === "produits" || value === "bibliotheque" || value === "fournitures") {
    return "produits";
  }
  return "fournisseurs";
}

export function ParametresBibliothequePage() {
  const { data, setData } = useStore();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<FournitureTab>(() =>
    parseInitialTab(searchParams.get("tab")),
  );
  const [fournisseursSession, setFournisseursSession] = useState(0);

  const companyId = getAccount()?.supabaseUserId ?? "local";

  function patchParametresLibrary(patch: Partial<typeof data.parametres>) {
    setData((prev) => {
      const parametres = { ...prev.parametres, ...patch };
      const bibliothequeEntreprise = patch.entreprisePriceLibrary
        ? syncBibliothequeFromPriceLibrary(
            prev.bibliothequeEntreprise,
            patch.entreprisePriceLibrary,
          )
        : prev.bibliothequeEntreprise;
      return { ...prev, parametres, bibliothequeEntreprise };
    });
  }

  return (
    <div className="btp-app-page mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Fourniture"
        description="Fournisseurs, produits et comparatifs de prix."
      />

      <nav className="flex flex-wrap gap-1 border-b border-border/60">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (tab.id === "fournisseurs") {
                setFournisseursSession((session) => session + 1);
              }
              setActiveTab(tab.id);
            }}
            className={`rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "fournisseurs" ? (
        <BibliothequeFournisseursView
          key={`fournisseurs-${fournisseursSession}`}
          parametres={data.parametres}
          companyId={companyId}
          onParametresChange={patchParametresLibrary}
        />
      ) : null}

      {activeTab === "produits" ? (
        <BibliothequeProduitsView
          parametres={data.parametres}
          companyId={companyId}
          onParametresChange={patchParametresLibrary}
        />
      ) : null}

      {activeTab === "comparatif" ? (
        <BibliothequeComparatifView
          parametres={data.parametres}
          companyId={companyId}
          onParametresChange={patchParametresLibrary}
        />
      ) : null}
    </div>
  );
}

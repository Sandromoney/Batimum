import { CHANTIERS_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/chantiers-knowledge";
import { CLIENTS_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/clients-knowledge";
import { COMMANDES_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/commandes-knowledge";
import { CONVERSATION_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/conversation-knowledge";
import { DASHBOARD_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/dashboard-knowledge";
import { DEVIS_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/devis-knowledge";
import { EMPLOYEES_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/employees-knowledge";
import { FACTURES_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/factures-knowledge";
import { FOURNITURES_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/fournitures-knowledge";
import { MUM_IA_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/mum-ia-knowledge";
import { PARAMETRES_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/parametres-knowledge";
import { PILOTAGE_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/pilotage-knowledge";
import { PLANNING_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/planning-knowledge";
import { BTP_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/btp-knowledge";
import { BATIMUM_APP_KNOWLEDGE } from "@/lib/assistant-batimum/knowledge/batimum-app-knowledge";
import { buildGeneratedFormulations } from "@/lib/assistant-batimum/intent-library/formulation-generator";
import { FORMULATION_KEYWORDS } from "@/lib/assistant-batimum/knowledge/formulations";
import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";

function enrichKeywords(entries: KnowledgeEntry[]): KnowledgeEntry[] {
  const generated = buildGeneratedFormulations();
  return entries.map((entry) => {
    const manual = FORMULATION_KEYWORDS[entry.id] ?? [];
    const auto = generated[entry.id] ?? [];
    const extra = [...manual, ...auto];
    if (!extra.length) return entry;
    const keywords = [...new Set([...entry.keywords, ...extra])];
    return { ...entry, keywords };
  });
}

const RAW_ENTRIES: KnowledgeEntry[] = [
  ...CONVERSATION_KNOWLEDGE,
  ...DASHBOARD_KNOWLEDGE,
  ...CLIENTS_KNOWLEDGE,
  ...DEVIS_KNOWLEDGE,
  ...FACTURES_KNOWLEDGE,
  ...CHANTIERS_KNOWLEDGE,
  ...PLANNING_KNOWLEDGE,
  ...PILOTAGE_KNOWLEDGE,
  ...MUM_IA_KNOWLEDGE,
  ...FOURNITURES_KNOWLEDGE,
  ...COMMANDES_KNOWLEDGE,
  ...EMPLOYEES_KNOWLEDGE,
  ...PARAMETRES_KNOWLEDGE,
  ...BTP_KNOWLEDGE,
  ...BATIMUM_APP_KNOWLEDGE,
];

export const ALL_KNOWLEDGE_ENTRIES: KnowledgeEntry[] = enrichKeywords(RAW_ENTRIES);

const BY_ID = new Map<string, KnowledgeEntry>();
for (const entry of ALL_KNOWLEDGE_ENTRIES) {
  const existing = BY_ID.get(entry.id);
  if (!existing || (entry.priority ?? 0) > (existing.priority ?? 0)) {
    BY_ID.set(entry.id, entry);
  }
}

export function getKnowledgeEntry(id: string): KnowledgeEntry | undefined {
  return BY_ID.get(id);
}

export function getKnowledgeByDomain(domain: string): KnowledgeEntry[] {
  return ALL_KNOWLEDGE_ENTRIES.filter((e) => e.domain === domain);
}

export const KNOWLEDGE_STATS = {
  totalEntries: ALL_KNOWLEDGE_ENTRIES.length,
  domains: [...new Set(ALL_KNOWLEDGE_ENTRIES.map((e) => e.domain))],
};

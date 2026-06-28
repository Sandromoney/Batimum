import type { PdpAdapter } from "./pdp-adapter";

/** Catalogue UI — aucune intégration active tant qu'un adaptateur n'est pas enregistré. */
export const PDP_PROVIDER_CATALOG = [
  { id: "", label: "Non configurée" },
  { id: "chorus-pro", label: "Chorus Pro" },
  { id: "pennylane", label: "Pennylane" },
  { id: "yooz", label: "Yooz" },
  { id: "custom", label: "Autre PDP" },
] as const;

export type PdpProviderCatalogId = (typeof PDP_PROVIDER_CATALOG)[number]["id"];

const adapters = new Map<string, PdpAdapter>();

export function registerPdpAdapter(adapter: PdpAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function unregisterPdpAdapter(providerId: string): void {
  adapters.delete(providerId);
}

export function getPdpAdapter(providerId: string): PdpAdapter | undefined {
  return adapters.get(providerId);
}

export function listRegisteredPdpAdapters(): PdpAdapter[] {
  return [...adapters.values()];
}

export function getPdpProviderLabel(providerId?: string): string {
  if (!providerId) return "Non configurée";
  const fromCatalog = PDP_PROVIDER_CATALOG.find((item) => item.id === providerId);
  if (fromCatalog) return fromCatalog.label;
  const adapter = adapters.get(providerId);
  return adapter?.label ?? providerId;
}

export function isPdpProviderImplemented(providerId?: string): boolean {
  if (!providerId) return false;
  const adapter = adapters.get(providerId);
  return Boolean(adapter?.implemented);
}

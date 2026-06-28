import type { Client, TypeClient } from "@/lib/types";

export function normalizeTypeClient(type?: TypeClient): TypeClient {
  return type === "professionnel" ? "professionnel" : "particulier";
}

export function normalizeClient(client: Client): Client {
  return {
    ...client,
    typeClient: normalizeTypeClient(client.typeClient),
    adresse: client.adresse?.trim() ?? "",
    codePostal: client.codePostal?.trim() ?? "",
    ville: client.ville?.trim() ?? "",
    email: client.email?.trim() ?? "",
  };
}

export function normalizeClientEmail(email?: string): string {
  return email?.trim().toLowerCase() ?? "";
}

export function normalizeClientPhone(
  indicatif?: string,
  telephone?: string,
): string {
  const digits = (telephone ?? "").replace(/\D/g, "");
  const prefix = (indicatif ?? "+33").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0") && prefix === "33") return `33${digits.slice(1)}`;
  if (digits.startsWith(prefix)) return digits;
  return `${prefix}${digits}`;
}

export function findDuplicateClient(
  clients: Client[],
  input: Pick<Client, "email" | "telephone" | "indicatifTelephone">,
  excludeId?: string,
): Client | undefined {
  const email = normalizeClientEmail(input.email);
  const phone = normalizeClientPhone(input.indicatifTelephone, input.telephone);

  return clients.find((client) => {
    if (excludeId && client.id === excludeId) return false;
    if (email && normalizeClientEmail(client.email) === email) return true;
    if (
      phone.length >= 8 &&
      normalizeClientPhone(client.indicatifTelephone, client.telephone) === phone
    ) {
      return true;
    }
    return false;
  });
}

export function resolveClientIdForDocument(
  clients: Client[],
  input: Pick<
    Client,
    | "typeClient"
    | "nom"
    | "prenom"
    | "societe"
    | "email"
    | "indicatifTelephone"
    | "telephone"
    | "adresse"
    | "codePostal"
    | "ville"
  >,
): string {
  const duplicate = findDuplicateClient(clients, input);
  return duplicate?.id ?? "";
}

export function isClientProfessionnel(
  client?: Pick<Client, "typeClient">,
): boolean {
  return normalizeTypeClient(client?.typeClient) === "professionnel";
}

export function getClientDisplayName(client?: Pick<Client, "nom" | "prenom" | "societe">) {
  if (!client) return "—";

  const personName = [client.nom, client.prenom].filter(Boolean).join(" ").trim();
  if (personName) return personName;

  return client.societe || "Client";
}

export function getClientAddress(
  client?: Pick<Client, "adresse" | "codePostal" | "ville"> | null,
) {
  if (!client) return "—";

  return [client.adresse, client.codePostal, client.ville]
    .filter(Boolean)
    .join(", ")
    .trim();
}

export function isClientAddressComplete(
  client?: Pick<Client, "adresse" | "codePostal" | "ville"> | null,
): boolean {
  if (!client) return false;
  return Boolean(
    client.adresse?.trim() &&
      client.codePostal?.trim() &&
      client.ville?.trim(),
  );
}

export function resolveDevisChantierAddress(
  devis: Pick<{ adresseChantier?: string }, "adresseChantier">,
  client?: Pick<Client, "adresse" | "codePostal" | "ville"> | null,
): string {
  const explicit = devis.adresseChantier?.trim();
  if (explicit) return explicit;
  if (!isClientAddressComplete(client)) return "";
  return getClientAddress(client);
}

export function hasDevisChantierAddress(
  devis: Pick<{ adresseChantier?: string }, "adresseChantier">,
  client?: Pick<Client, "adresse" | "codePostal" | "ville"> | null,
): boolean {
  const explicit = devis.adresseChantier?.trim();
  if (explicit) {
    return /\d{5}/.test(explicit) && explicit.length >= 10;
  }
  return isClientAddressComplete(client);
}

export function hasIncompleteProClientInfo(
  client?: Pick<Client, "typeClient" | "siret">,
): boolean {
  if (!isClientProfessionnel(client)) return false;
  return !client?.siret?.trim();
}


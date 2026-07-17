export function logSupplierSearch(
  field: string,
  value: unknown,
): void {
  console.log(`[SUPPLIER SEARCH] ${field}=`, value);
}

export function logSupplierSearchError(error: unknown): void {
  if (error instanceof Error) {
    logSupplierSearch("errorName", error.name);
    logSupplierSearch("errorMessage", error.message);
    logSupplierSearch("errorStack", error.stack ?? "(no stack)");
    return;
  }
  logSupplierSearch("errorMessage", String(error));
}

export function logSupplierSearchClient(field: string, value: unknown): void {
  console.log(`[SUPPLIER SEARCH CLIENT] ${field}=`, value);
}

export const MIN_SEARCH_QUERY_LENGTH = 2;

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenMatchesHaystack(token: string, haystack: string): boolean {
  const hay = normalizeSearchText(haystack);
  const normalizedToken = normalizeSearchText(token);
  if (!normalizedToken) return true;

  if (hay.includes(normalizedToken)) return true;

  const words = hay.split(/\s+/).filter(Boolean);
  return words.some(
    (word) => word === normalizedToken || word.startsWith(normalizedToken),
  );
}

/** Correspondance stricte : pas de résultat si le texte dépasse un mot existant. */
export function matchesSearchQuery(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) return true;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  return tokens.every((token) => tokenMatchesHaystack(token, haystack));
}

export function isActiveSearchQuery(query: string): boolean {
  return normalizeSearchText(query).length >= MIN_SEARCH_QUERY_LENGTH;
}

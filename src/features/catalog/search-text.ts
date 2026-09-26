/*
 * Shared catalog text-matching rules.
 *
 * The same rules are implemented in SQL by `private.catalog_search_matches`
 * so that the demo repository and the Supabase repository answer identically.
 * Keep both sides in sync when changing token length, prefix length or folding.
 */

const MIN_TOKEN_LENGTH = 3;
const MAX_TOKENS = 8;
const MIN_PREFIX_LENGTH = 4;
const MAX_PREFIX_LENGTH = 8;

// Mirrors the `translate()` pair used by `private.catalog_search_normalize`.
const foldedCharacters: Record<string, string> = {
  ё: "е",
  ă: "a",
  â: "a",
  î: "i",
  ș: "s",
  ț: "t",
  ş: "s",
  ţ: "t",
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(
      /[ёăâîșțşţ]/g,
      (character) => foldedCharacters[character] ?? character,
    );
}

/*
 * Inflection-tolerant stem: "холодильники" and "холодильник" share a prefix,
 * as do "mașini" and "masina" once diacritics are folded.
 */
export function searchTokenPrefix(token: string): string {
  return token.slice(
    0,
    Math.max(MIN_PREFIX_LENGTH, Math.min(token.length - 2, MAX_PREFIX_LENGTH)),
  );
}

export function searchTokens(value: string): string[] {
  const tokens = normalizeSearchText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
  return [...new Set(tokens)].slice(0, MAX_TOKENS);
}

/*
 * Every usable token must appear in the haystack. A query without usable
 * tokens keeps the historical whole-phrase substring behaviour.
 */
export function matchesSearchQuery(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query).trim();
  if (!normalizedQuery) return true;
  const normalizedHaystack = normalizeSearchText(haystack);
  const tokens = searchTokens(normalizedQuery);
  if (!tokens.length) return normalizedHaystack.includes(normalizedQuery);
  return tokens.every((token) =>
    normalizedHaystack.includes(searchTokenPrefix(token)),
  );
}

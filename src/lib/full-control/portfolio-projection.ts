export function portfolioClientCount(
  canonicalIds: readonly string[] | null,
  historicalIds: readonly (string | null)[],
) {
  if (canonicalIds === null) return null;
  return new Set([...canonicalIds, ...historicalIds].filter((id): id is string => Boolean(id)))
    .size;
}

export function frecency(entry: { lastUsedTimestamp: number; uses: number }) {
  const minutes = (Date.now() - entry.lastUsedTimestamp) / (60 * 1000)
  const frecency = entry.uses / minutes
  return frecency
}

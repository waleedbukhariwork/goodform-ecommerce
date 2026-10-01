export type AccountState = "new" | "verified" | "unverified";

export function accountStateFrom(
  row: { emailVerified: boolean } | undefined,
): AccountState {
  if (!row) return "new";
  return row.emailVerified ? "verified" : "unverified";
}

/** True when this caller may ask again. The map is per process. */
export function allowLookup(
  buckets: Map<string, { count: number; reset: number }>,
  key: string,
  now: number,
  limit = 30,
  windowMs = 60_000,
) {
  for (const [entry, value] of buckets) {
    if (value.reset <= now) buckets.delete(entry);
  }
  const current = buckets.get(key);
  if (!current) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

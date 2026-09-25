import { z } from 'zod'

/** A task or note can carry up to this many versions (DB check: `cardinality(versions) <= 10`). */
export const MAX_VERSIONS = 10

/** One free-text version a task or note is linked to, e.g. "v3.9.0". */
export const versionSchema = z
  .string()
  .trim()
  .min(1)
  .max(40, 'Up to 40 characters')
  // Commas, braces and quotes would break the Postgres array literal the version filter sends.
  .regex(/^[^,{}"]+$/, 'No commas, braces or quotes')

/** Every distinct version across the lists, newest-looking first ("v3.10.0" before "v3.9.0"). */
export function mergeVersions(...lists) {
  const unique = [...new Set(lists.flat().filter(Boolean))]
  return unique.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
}

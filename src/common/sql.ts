/**
 * Builds a `%value%` pattern for ILIKE where `%`, `_` and `\` typed by the
 * user are matched literally. Use together with `ESCAPE '\'` in the query.
 */
export function containsPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

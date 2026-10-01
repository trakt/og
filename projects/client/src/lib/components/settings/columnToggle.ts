/**
 * What a notification table's column header sets every checkbox in its column to: on, unless they're all on already
 * (OG's settings.js:464-476).
 */
export function columnToggle(values: readonly boolean[]): boolean {
  return !values.every(Boolean);
}

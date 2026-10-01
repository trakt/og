/** Completed/partial history takes priority over the default date; the side button always asks. */
export function watchAction({ fill, force, defaultAt }: { fill: number; force: boolean; defaultAt?: string | null }) {
  if (force) return 'date';
  if (fill >= 1) return 'remove';
  if (fill > 0) return 'partial';
  if (defaultAt === 'now' || defaultAt === 'released' || defaultAt === 'unknown') return defaultAt;
  return 'date';
}

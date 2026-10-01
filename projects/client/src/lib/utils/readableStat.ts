const UNITS = [
  { size: 1_000_000_000, suffix: 'b' },
  { size: 1_000_000, suffix: 'm' },
  { size: 1_000, suffix: 'k' },
] as const;

/**
 * OG's `readable_stat`: 999, then 1.0k, 12.5k, 150k, 1.2m, 3.0b. One decimal until the value passes 100 of a unit,
 * then whole numbers.
 */
export function readableStat(value: number | null | undefined): string {
  const n = Math.max(0, value ?? 0);
  const unit = UNITS.find(({ size }) => n >= size);
  if (!unit) return String(Math.floor(n));

  const scaled = n / unit.size;
  return `${n > unit.size * 100 ? Math.round(scaled) : scaled.toFixed(1)}${unit.suffix}`;
}

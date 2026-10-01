// Reads deno.json's `minimumDependencyAge`, so the bump job and `deno install` apply the same rule.
// Only the minutes form is supported; og sets it that way so there's one number to read.
export function minimumAgeMinutes(denoJson: { readonly minimumDependencyAge?: unknown }): number {
  const value = denoJson.minimumDependencyAge;
  const minutes = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 0) {
    throw new Error('deno.json needs `minimumDependencyAge` as a whole number of minutes, e.g. 1440 for 24h.');
  }
  return minutes;
}

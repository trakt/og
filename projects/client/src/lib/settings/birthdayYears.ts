/**
 * The birthday's year options, newest first: 12 to 100 years back, as OG's date select had them
 * A saved year outside that range stays in the list, so saving leaves it alone.
 */
export function birthdayYears({ year, saved }: { year: number; saved: string }): readonly string[] {
  const years = Array.from({ length: 89 }, (_, index) => String(year - 12 - index));
  if (saved === '' || years.includes(saved)) return years;
  return [...years, saved].sort((a, b) => Number(b) - Number(a));
}

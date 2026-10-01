import type { FilterOption } from './filterOptions.ts';

/** Mixed calendars offer one alphabetical list, with movie labels taking precedence as in OG's merged hashes. */
export function mergeFilterOptions(rows: readonly (readonly FilterOption[])[]): FilterOption[] {
  if (rows.length === 1) return [...(rows.at(0) ?? [])];
  return [...new Map(rows.flat().map((option) => [option.value, option])).values()]
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
}

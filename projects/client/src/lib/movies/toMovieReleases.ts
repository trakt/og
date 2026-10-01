import { countryName, titleize } from '../components/summary/names.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { formatDate } from '../utils/formatDate.ts';

interface Release {
  readonly country: string;
  readonly certification?: string | null;
  readonly release_date: string;
  readonly release_type?: string;
  readonly note?: string | null;
}

/** Country panels in name order, with each country's dates in chronological order. */
export function toMovieReleases({
  releases,
  originalCountry,
  datePreferences,
}: {
  releases: readonly Release[];
  originalCountry?: string | null;
  datePreferences: DatePreferences;
}) {
  const countries = [...new Set(releases.map(({ country }) => country.toLowerCase()))];
  return countries.map((code) => ({
    code,
    name: countryName(code),
    original: code === originalCountry?.toLowerCase(),
    rows: releases.filter(({ country }) => country.toLowerCase() === code)
      .toSorted((a, b) => a.release_date.localeCompare(b.release_date))
      .map((release) => ({
        date: release.release_date,
        // These are calendar dates, not local instants: never shift the day with the viewer's time zone.
        dateText: formatDate(release.release_date.slice(0, 10), { ...datePreferences, timeZone: 'UTC', format: 'll' }),
        certification: release.certification ?? '',
        type: release.release_type === 'limited'
          ? 'Theatrical'
          : release.release_type === 'tv'
          ? 'TV'
          : titleize(release.release_type ?? 'unknown'),
        qualifier: release.release_type === 'limited' ? '(limited)' : '',
        note: release.note ?? '',
      })),
  })).toSorted((a, b) => a.name.localeCompare(b.name, 'en'));
}

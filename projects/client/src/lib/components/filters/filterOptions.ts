// FIXME(zod-4): see noteRowsSchema.ts. og has one zod, the one @trakt/api depends on.
import { z } from 'zod/v4';
import type { ListFilterKey } from './advancedFilters.ts';

/** One choice in a filter's list. `tag` is the small right-hand label OG's Chosen lists showed (a country, "Free"). */
export type FilterOption = {
  readonly value: string;
  readonly label: string;
  readonly tag?: string;
  readonly avatar?: string;
};

/** A labelled run of options: watch now's "Bundles" and "Streaming Services". */
export type FilterOptionGroup = { readonly label?: string; readonly options: readonly FilterOption[] };

// Genres, certifications, languages, countries and networks come from the API (`X-Runtime`), so
// each body is parsed here.
const named = z.array(z.object({ name: z.string(), slug: z.string() }));
const coded = z.array(z.object({ name: z.string(), code: z.string() }));
const certifications = z.record(z.string(), named);
const networks = z.array(z.object({ name: z.string(), country: z.string().nullish() }));

export const toGenreOptions = (body: unknown): FilterOption[] =>
  named.parse(body).map(({ name, slug }) => ({ value: slug, label: name }));

/** Only the US ratings: OG's `TV_CERTIFICATIONS` and `MOVIE_CERTIFICATIONS` were the US sets. */
export const toCertificationOptions = (body: unknown): FilterOption[] =>
  (certifications.parse(body).us ?? []).map(({ name, slug }) => ({ value: slug, label: name }));

export const toCodedOptions = (body: unknown): FilterOption[] =>
  coded.parse(body).map(({ name, code }) => ({ value: code, label: name }));

/**
 * Networks by name, since the API filters by name. Networks sharing a name ("HBO" in two countries, "Netflix" and
 * "NETFLIX") match the same shows, so they list once, as the first one.
 */
export function toNetworkOptions(body: unknown): FilterOption[] {
  const rows = networks.parse(body)
    .map(({ name, country }) => ({ name: name.trim(), country }))
    .filter(({ name }) => name !== '');
  const byName = new Map(rows.toReversed().map((row) => [row.name.toLowerCase(), row]));

  return [...byName.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
    .map(({ name, country }) => ({ value: name, label: name, ...(country && { tag: country.toUpperCase() }) }));
}

/** Every status a show can have (`Show.status_list` in OG), in the order a show moves through them. */
export const statusOptions: readonly FilterOption[] = [
  'returning series',
  'continuing',
  'in production',
  'planned',
  'upcoming',
  'pilot',
  'canceled',
  'ended',
].map((value) => ({ value, label: value.replace(/\b\w/g, (letter) => letter.toUpperCase()) }));

/** Where each list's options come from. Status has no endpoint. */
export const optionPaths: Record<
  Exclude<ListFilterKey, 'status' | 'episode_types'>,
  (type: 'shows' | 'movies') => string
> = {
  genres: (type) => `/genres/${type}`,
  certifications: (type) => `/certifications/${type}`,
  languages: (type) => `/languages/${type}`,
  countries: (type) => `/countries/${type}`,
  networks: () => '/networks',
};

export const optionMappers: Record<
  Exclude<ListFilterKey, 'status' | 'episode_types'>,
  (body: unknown) => FilterOption[]
> = {
  genres: toGenreOptions,
  certifications: toCertificationOptions,
  languages: toCodedOptions,
  countries: toCodedOptions,
  networks: toNetworkOptions,
};

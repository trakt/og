import { movieGenres, tvGenres } from '../users/history/historyTypes.ts';

/**
 * The genre dropdown after All Genres: OG's movie and TV genres merged, by name.
 */
export const listGenreOptions: readonly { readonly slug: string; readonly label: string }[] = Object.entries({
  ...movieGenres,
  ...tvGenres,
})
  .map(([slug, label]) => ({ slug, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'en'));

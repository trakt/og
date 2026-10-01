import type { CreditsQuery } from './CreditsQuery.ts';

/** The query string for a credits view, the inverse of toCreditsQuery. Defaults are left out. */
export function toCreditsSearch({ sort, reversed, terms, movies, shows, fade, hide }: CreditsQuery): string {
  const params = new URLSearchParams();
  if (fade.length) params.set('fade', fade.join(','));
  if (hide.length) params.set('hide', hide.join(','));
  if (sort !== 'released' || reversed) params.set('sort', `${sort},${reversed ? 'desc' : 'asc'}`);
  if (!movies || !shows) params.set('display', [movies && 'movie', shows && 'show'].filter(Boolean).join(','));
  if (terms.trim()) params.set('terms', terms.trim());
  const search = params.toString().replaceAll('%2C', ',');
  return search ? `?${search}` : '';
}

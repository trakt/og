import { error, redirect } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import type { HeaderUser } from '../components/header/HeaderUser.ts';
import { loadWatchNow } from '../components/watchnow/loadWatchNow.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import { toMovieLinks } from './toMovieLinks.ts';
import { toMovieReleases } from './toMovieReleases.ts';

/** Public release dates never send a viewer token. */
export async function loadMovieReleases({ fetch, parent, id }: {
  fetch: typeof globalThis.fetch;
  parent: () => Promise<{ datePreferences: DatePreferences; settings: ViewerSettings | null; user: HeaderUser | null }>;
  id: string;
}) {
  const client = api({ fetch });
  const [summary, releases, { datePreferences, settings, user }] = await Promise.all([
    client.movies.summary({ params: { id }, query: { extended: 'full,images' } }),
    client.movies.releases({ params: { id } }),
    parent(),
  ]);
  if (summary.status === 404) error(404, 'Movie not found');
  if (summary.status !== 200) error(502, 'The Trakt API could not load this movie.');
  const movie = summary.body;
  if (id !== movie.ids.slug) redirect(301, `/movies/${movie.ids.slug}/releases`);
  if (releases.status !== 200) error(502, 'The Trakt API could not load these release dates.');
  const country = settings?.browsing?.watchnow?.country?.toLowerCase() || 'us';
  const watchNow = await loadWatchNow({
    fetch,
    path: `/movies/${movie.ids.slug}`,
    country,
    settings,
    isVip: user?.isVip ?? false,
  });
  return {
    watchNow: watchNow.button,
    movie: {
      id: movie.ids.trakt,
      updatedAt: movie.updated_at ?? null,
      title: movie.title,
      year: movie.year,
      href: `/movies/${movie.ids.slug}`,
      fullTitle: movie.year ? `${movie.title} (${movie.year})` : movie.title,
      overview: movie.overview,
      fanart: imageUrl(movie.images?.fanart?.at(0), 'full'),
      poster: imageUrl(movie.images?.poster?.at(0), 'medium'),
      links: toMovieLinks({ movie, rank: null }),
    },
    countries: toMovieReleases({ releases: releases.body, originalCountry: movie.country, datePreferences }),
  };
}

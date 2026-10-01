import type { UserStatsResponse } from '@trakt/api';
import { api } from '../../api/api.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import { toPanelSettings } from '../../settings/toPanelSettings.ts';
import type { ViewerSettings } from '../../settings/ViewerSettings.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import { toUserComment } from '../comments/toUserComment.ts';
import type { UserCommentRow } from '../comments/UserCommentRow.ts';
import { fetchRecentHistory } from '../fetchRecentHistory.ts';
import type { ProfileUser } from '../ProfileUser.ts';
import { fetchProfileCharts } from './fetchProfileCharts.ts';
import { toGenreBar } from './toGenreBar.ts';
import { toMostWatched } from './toMostWatched.ts';
import {
  toFavoriteCard,
  toLastWatched,
  toWatchedEpisode,
  toWatchedMovie,
  toWatchedTotals,
} from './toProfileSummary.ts';
import { toRatingsChart } from './toRatingsChart.ts';

type Params = {
  fetch: typeof fetch;
  locals: { token: string | null };
  params: { id: string };
  parent: () => Promise<{
    profile: ProfileUser;
    stats: UserStatsResponse | null;
    isSelf: boolean;
    datePreferences: DatePreferences;
    /** The viewer's own settings, from the root layout. */
    settings: ViewerSettings | null;
  }>;
  now?: Date;
};

type Client = ReturnType<typeof api>;
type FavoritesSort = { readonly sort_by: string; readonly sort_how: 'asc' | 'desc' };

// OG's default, and the only order another viewer can know: the owner's saved sort is
// in their own `/users/settings`. The worker reshuffles Random daily.
const RANDOM: FavoritesSort = { sort_by: 'random', sort_how: 'asc' };

// LIST_SORT_OPTIONS all default to `asc`, so the saved direction is the worker's as-is.
const fetchFavorites = (client: Client, id: string, sort: FavoritesSort) =>
  client.users.favorites.typedSorted({
    params: { id, type: 'movie,show', ...sort },
    query: { extended: 'full,images', limit: 3 },
  });

async function fetchSections(
  { fetch, token }: { fetch: typeof globalThis.fetch; token?: string | null },
  id: string,
  now: Date,
  favoritesSort: FavoritesSort = RANDOM,
) {
  const client = api({ fetch, token });
  const history = { params: { id }, query: { extended: 'full,images' } } as const;

  const [episodes, movies, favorites, watchlist, comments, recent, charts] = await Promise.all([
    client.users.history.episodes({ ...history, query: { ...history.query, limit: 4 } }),
    client.users.history.movies({ ...history, query: { ...history.query, limit: 6 } }),
    fetchFavorites(client, id, favoritesSort),
    client.users.watchlist.all({ params: { id, sort: 'rank' }, query: { extended: 'full,images', limit: 1 } }),
    // Newest first, the one order the worker has: OG's Recent tab.
    client.users.comments({
      params: { id, comment_type: 'all', type: 'all' },
      query: { extended: 'full,images', limit: 3 },
    }),
    fetchRecentHistory({ client, id, now }),
    fetchProfileCharts({ fetch, token, id }),
  ]);

  return {
    episodes,
    movies,
    favorites,
    watchlist,
    comments,
    recent,
    charts,
  };
}

/**
 * The profile page under the frame: the stat boxes or the welcome hero, favorites, the
 * recently watched rows, the genre and ratings charts, the most watched columns and the newest comments. Public reads
 * go without the token and alongside the frame's load; a private profile the viewer may see is read again with it.
 * On your own profile your saved favorites sort, most watched sorts and default tabs apply; favorites in a
 * saved order are read again with your token, since the sort may be about you (Watched or Collected Date).
 */
export async function loadProfile({ fetch, locals, params, parent, now = new Date() }: Params) {
  const [anonymous, { profile, stats, isSelf, datePreferences, settings }] = await Promise.all([
    fetchSections({ fetch }, params.id, now),
    parent(),
  ]);
  // Whether the viewer has any activity.
  const activity = stats !== null &&
    [stats.episodes.minutes, stats.movies.minutes, stats.episodes.collected, stats.movies.collected].some((n) => n > 0);

  if (profile.isLocked) {
    return {
      boxes: null,
      welcome: false,
      favorites: [],
      episodes: [],
      movies: [],
      charts: null,
      mostWatched: null,
      comments: [],
    };
  }

  const prefs = isSelf ? toPanelSettings(settings).profile : null;
  const favoritesSort: FavoritesSort = prefs?.favorites ?? RANDOM;
  const saved = favoritesSort.sort_by !== RANDOM.sort_by || favoritesSort.sort_how !== RANDOM.sort_how;
  const token = locals.token;
  const [sections, ownFavorites] = await Promise.all([
    profile.isPrivate ? fetchSections({ fetch, token }, params.id, now, favoritesSort) : anonymous,
    saved && !profile.isPrivate && token ? fetchFavorites(api({ fetch, token }), params.id, favoritesSort) : null,
  ]);
  const episodes = sections.episodes.status === 200 ? sections.episodes.body : [];
  const movies = sections.movies.status === 200 ? sections.movies.body : [];
  // A saved order the worker refused, or a stale token, keeps the random ones.
  const favoritesRead = ownFavorites?.status === 200 ? ownFavorites : sections.favorites;
  const favorites = favoritesRead.status === 200 ? favoritesRead.body : [];
  const comments: readonly UserCommentRow[] = sections.comments.status === 200 ? sections.comments.body : [];
  const watchlist = sections.watchlist.status === 200 ? sections.watchlist : null;
  const firstListed = watchlist?.body.at(0);
  const listedMedia = firstListed && 'movie' in firstListed
    ? firstListed.movie
    : firstListed && 'show' in firstListed
    ? firstListed.show
    : undefined;

  return {
    boxes: activity && stats
      ? {
        lastWatched: toLastWatched(episodes.at(0), movies.at(0)),
        recent: {
          episodes: toWatchedTotals(sections.recent.episodes),
          movies: toWatchedTotals(sections.recent.movies),
        },
        allTime: {
          episodes: { minutes: stats.episodes.minutes, unique: stats.episodes.watched },
          movies: { minutes: stats.movies.minutes, unique: stats.movies.watched },
        },
        // The owner's chosen featured list isn't in the API, so it's always the watchlist.
        featured: {
          name: 'Watchlist',
          href: `/users/${profile.slug}/watchlist`,
          empty: !(Number(watchlist?.headers.get('x-pagination-item-count')) > 0),
          image: imageUrl(listedMedia?.images?.fanart?.at(0), 'thumb'),
        },
      }
      : null,
    welcome: isSelf && stats !== null && !activity,
    favorites: favorites.map(toFavoriteCard),
    episodes: episodes.map((row) => toWatchedEpisode(row, datePreferences)),
    movies: movies.map((row) => toWatchedMovie(row, datePreferences)),
    // OG hid the whole charts section, ratings too, when there were no genres (`users.js:383-386`).
    charts: sections.charts.genres.length > 0
      ? {
        genres: sections.charts.genres.map((row) => toGenreBar(row, { slug: profile.slug })),
        ratings: toRatingsChart(stats?.ratings.distribution),
      }
      : null,
    mostWatched: {
      shows: toMostWatched('shows', {
        history: sections.recent.episodes,
        watched: sections.charts.shows,
        prefs: prefs?.most_watched_shows,
      }),
      movies: toMostWatched('movies', {
        history: sections.recent.movies,
        watched: sections.charts.movies,
        prefs: prefs?.most_watched_movies,
      }),
      // OG's first tab, `start_at` in its see-more link.
      windowStart: sections.recent.start,
    },
    comments: comments.flatMap((row) => toUserComment(row) ?? []),
  };
}

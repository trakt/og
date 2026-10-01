import type { z } from 'zod/v4';
import { episodeNumber } from '../../components/media/episodeTags.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import { formatDate } from '../../utils/formatDate.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import { episodeBadge } from '../profile/toProfileSummary.ts';
import type { ratingRowsSchema } from './ratingRowsSchema.ts';
import type { ratingQuery } from './ratingQuery.ts';

type Row = z.infer<typeof ratingRowsSchema>[number];
type Options = {
  type: ReturnType<typeof ratingQuery>['type'];
  by: ReturnType<typeof ratingQuery>['by'];
  datePreferences: DatePreferences;
};

/** One rated poster or episode still, reusing summary numbering, badges, image and date helpers. */
export function toRatingCard(row: Row, { type, by, datePreferences }: Options) {
  const item = row.type === 'movie'
    ? row.movie
    : row.type === 'show'
    ? row.show
    : row.type === 'season'
    ? row.season
    : row.episode;
  if (!item || ((row.type === 'season' || row.type === 'episode') && !row.show)) return null;
  const show = 'show' in row ? row.show : null;
  const showHref = `/shows/${show?.ids.slug}`;
  const screenshots = row.type === 'episode' && type === 'episodes';
  const seasonTitle = row.type === 'season' && row.season
    ? row.season.title ?? (row.season.number === 0 ? 'Specials' : `Season ${row.season.number}`)
    : undefined;
  const href = row.type === 'movie' && row.movie
    ? `/movies/${row.movie.ids.slug}`
    : row.type === 'season' && row.season
    ? `${showHref}/seasons/${row.season.number}`
    : row.type === 'episode' && row.episode
    ? `${showHref}/seasons/${row.episode.season}/episodes/${row.episode.number}`
    : showHref;
  const released = item.released ?? item.first_aired;
  const runtime = 'runtime' in item ? item.runtime : undefined;
  const line = by === 'added'
    ? formatDate(row.rated_at, { ...datePreferences, time: true })
    : by === 'released' && released
    ? formatDate(released, { ...datePreferences, ...(row.type === 'movie' ? { timeZone: 'UTC' } : { time: true }) })
    : by === 'runtime'
    ? `${runtime ?? 0} minute${runtime === 1 ? '' : 's'}`
    : ['percentage', 'votes'].includes(by)
    ? `${(item.votes ?? 0).toLocaleString('en-US')} vote${item.votes === 1 ? '' : 's'}`
    : undefined;
  const poster = row.type === 'episode' ? show?.images?.poster : item.images?.poster;
  return {
    key: `${row.type}-${item.ids.trakt}`,
    type: row.type,
    id: item.ids.trakt,
    href,
    title: seasonTitle ?? item.title ?? '',
    number: row.type === 'episode' && row.episode ? episodeNumber(row.episode, show?.genres) : undefined,
    image: imageUrl((screenshots ? item.images?.screenshot : poster)?.at(0), 'thumb'),
    variant: screenshots ? 'screenshot' as const : 'poster' as const,
    episodeBadge: row.type === 'episode' && row.episode ? episodeBadge(row.episode) : undefined,
    seasonOf: row.type === 'season' && row.season && show
      ? { show: show.ids.trakt, number: row.season.number }
      : row.type === 'episode' && row.episode && show
      ? { show: show.ids.trakt, number: row.episode.season, episode: row.episode.number }
      : undefined,
    airedEpisodes: 'aired_episodes' in item ? item.aired_episodes ?? undefined : undefined,
    rating: item.rating ?? undefined,
    ownerRating: row.rating,
    subtitles: [...(screenshots && show ? [{ text: show.title, href: showHref }] : []), ...(line ? [line] : [])],
    watchedAt: row.rated_at,
    runtime: 0,
  };
}

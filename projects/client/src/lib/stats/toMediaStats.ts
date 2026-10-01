import type { EpisodeStatsResponse, RatingsResponse } from '@trakt/api';
import { countryName } from '../components/summary/names.ts';
import { type StreamingRank, toExternalRatings } from '../components/summary/toExternalRatings.ts';
import type { SubpageMedia } from '../subpage/toSubpageMedia.ts';
import { toRatingsChart } from '../users/profile/toRatingsChart.ts';

type Params = {
  media: SubpageMedia;
  ratings: RatingsResponse;
  stats: EpisodeStatsResponse & { favorited?: number };
  rank: StreamingRank | null;
  country: string;
  otherSiteRatings: boolean;
  earlyRatings: boolean;
  now: Date;
};

/** The four stats pages share the ratings strip and OG's ten-bar distribution, including its empty axes. */
export function toMediaStats({ media, ratings, stats, rank, country, otherSiteRatings, earlyRatings, now }: Params) {
  const trakt = ratings.trakt ?? ratings;
  const value = trakt.rating ?? 0;
  const votes = trakt.votes ?? 0;
  const type = media.item.type;
  if (type === 'list') throw new Error('Lists have no ratings');
  const counts = [
    { count: stats.watchers, label: stats.watchers === 1 ? 'watcher' : 'watchers' },
    { count: stats.plays, label: stats.plays === 1 ? 'play' : 'plays' },
    { count: stats.collectors, label: stats.collectors === 1 ? 'library' : 'libraries' },
    { count: stats.comments, label: stats.comments === 1 ? 'comment' : 'comments', href: `${media.href}/comments` },
    { count: stats.lists, label: stats.lists === 1 ? 'list' : 'lists', href: `${media.href}/lists` },
    ...(type === 'movie' || type === 'show' ? [{ count: stats.favorited ?? 0, label: 'favorited' }] : []),
  ];
  return {
    value,
    votes,
    percent: Math.trunc(value * 10),
    level: Math.min(10, Math.max(0, Math.trunc(value))),
    bars: toRatingsChart(trakt.distribution ?? undefined, { showEmpty: true }).bars,
    strip: {
      rating: earlyRatings || (!!media.released && new Date(media.released) <= now)
        ? { value, votes, href: `${media.href}/stats` }
        : undefined,
      rateLabel: type,
      ratingTarget: { type, id: media.item.id, title: media.item.title, season: media.spoilerTarget?.season },
      external: otherSiteRatings && type !== 'season'
        ? toExternalRatings({ ratings, rank, countryName: countryName(country) })
        : [],
      counts,
    },
  };
}

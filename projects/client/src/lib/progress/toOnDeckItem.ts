import type { OnDeckItem } from '../components/media/OnDeckItem.ts';
import { episodeNumber, episodeType } from '../components/media/episodeTags.ts';
import type { ShowProgress } from '../components/media/ShowProgress.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { UpNextEntry } from './UpNextEntry.ts';

type BadgeKind = NonNullable<OnDeckItem['episodeBadge']>['kind'];

// `episodeType` shares its kind type with the fanart card tags, so narrow it to the badge's.
const BADGE_KINDS: ReadonlySet<string> = new Set<BadgeKind>([
  'series-premiere',
  'season-premiere',
  'mid-season-premiere',
  'mid-season-finale',
  'season-finale',
  'series-finale',
  'bonus',
  'trailer',
]);
const isBadgeKind = (kind: string): kind is BadgeKind => BADGE_KINDS.has(kind);

function toEpisodeBadge(episode: NonNullable<UpNextEntry['progress']['next_episode']>): OnDeckItem['episodeBadge'] {
  const type = episodeType(episode);
  if (!type || !isBadgeKind(type.kind)) return undefined;

  return { label: type.text, kind: type.kind };
}

type ToOnDeckItemParams = {
  entry: UpNextEntry;
  /** The same show fetched with `lifetime_stats`, for a rewatch's whole-show progress. */
  lifetime?: UpNextEntry;
  /** The viewer's slug, for the progress link. */
  username: string;
  /** With the season poster setting, the next episode's season poster. */
  seasonPoster?: string;
  /** With exact progress bars, each aired episode's watched state. */
  ticks?: readonly boolean[];
};

function toShowProgress({ aired, completed, stats }: UpNextEntry['progress']): ShowProgress {
  return {
    aired,
    completed,
    plays: stats?.play_count ?? 0,
    minutesWatched: stats?.minutes_watched,
    minutesLeft: stats?.minutes_left,
  };
}

/** Maps an up-next entry onto an on-deck card. A show with no next episode gets no card, as in OG. */
export function toOnDeckItem(
  { entry, lifetime, username, seasonPoster, ticks }: ToOnDeckItemParams,
): OnDeckItem | undefined {
  const { show, progress } = entry;
  const episode = progress.next_episode;
  if (!episode) return undefined;

  const slug = show.ids.slug;
  const rewatching = Boolean(progress.reset_at);

  return {
    showId: show.ids.trakt,
    showTitle: show.title,
    showHref: `/shows/${slug}`,
    episodeId: episode.ids.trakt,
    seasonNumber: episode.season,
    episode: episode.number,
    episodeHref: `/shows/${slug}/seasons/${episode.season}/episodes/${episode.number}`,
    episodeNumber: episodeNumber(episode, show.genres),
    episodeTitle: episode.title ?? undefined,
    episodeBadge: toEpisodeBadge(episode),
    poster: seasonPoster ?? imageUrl(show.images?.poster.at(0), 'thumb'),
    rating: episode.rating ?? undefined,
    runtime: episode.runtime ?? show.runtime ?? undefined,
    progressHref: `/users/${username}/progress?show=${show.ids.trakt}`,
    progress: toShowProgress(progress),
    ticks: ticks && ticks.length > 0 ? ticks : undefined,
    fullProgress: rewatching && lifetime ? toShowProgress(lifetime.progress) : undefined,
    rewatching,
  };
}

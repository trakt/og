import type { EpisodeResponse } from '@trakt/api';
import { episodeNumber } from '../components/media/episodeTags.ts';

/**
 * The previous and next episode arrows on an episode page and its subpages, across seasons in broadcast order.
 * Specials navigate within specials; normal episodes skip season 0 at the first episode of the series.
 */
export function episodeNeighbours({ showHref, genres, episode, seasons }: {
  showHref: string;
  genres: readonly string[] | null | undefined;
  episode: { readonly season: number; readonly number: number };
  seasons: readonly { readonly number: number; readonly episodes?: readonly EpisodeResponse[] | null }[];
}) {
  const ordered = seasons.filter(({ number }) => episode.season === 0 ? number === 0 : number > 0)
    .flatMap(({ episodes }) => episodes ?? []).toSorted((a, b) => a.season - b.season || a.number - b.number);
  const index = ordered.findIndex((item) => item.season === episode.season && item.number === episode.number);
  const neighbour = (item: EpisodeResponse | undefined, direction: string) =>
    item && ({
      href: `${showHref}/seasons/${item.season}/episodes/${item.number}`,
      label: `${direction} episode: ${episodeNumber(item, genres)} ${item.title ?? ''}`.trim(),
    });
  return {
    previous: index > 0 ? neighbour(ordered.at(index - 1), 'Previous') : undefined,
    next: index >= 0 ? neighbour(ordered.at(index + 1), 'Next') : undefined,
  };
}

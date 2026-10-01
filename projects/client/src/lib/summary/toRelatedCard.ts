import type { MovieResponse, ShowResponse } from '@trakt/api';
import { imageUrl } from '../utils/imageUrl.ts';

export type RelatedCard = {
  readonly type: 'movie' | 'show';
  readonly id: number;
  readonly href: string;
  readonly title: string;
  readonly year?: number;
  readonly poster?: string;
  /** The phone layout's fanart cards. */
  readonly fanart?: string;
  /** Out by `now`. OG hid the rating of anything unreleased or undated (`hideUnreleasedRatings`). */
  readonly released: boolean;
  readonly rating?: number;
  readonly airedEpisodes?: number;
  readonly runtime?: number;
};

type Related = { readonly type: 'movie'; readonly item: MovieResponse } | {
  readonly type: 'show';
  readonly item: ShowResponse;
};

/** One `/:type/:id/related?extended=full,images` row as a poster card. */
export function toRelatedCard(related: Related, now: Date): RelatedCard {
  const { type, item } = related;
  const releaseDate = related.type === 'show' ? related.item.first_aired : related.item.released;

  return {
    type,
    id: item.ids.trakt,
    href: `/${type}s/${item.ids.slug}`,
    title: item.title,
    year: item.year ?? undefined,
    poster: imageUrl(item.images?.poster?.at(0), 'thumb'),
    fanart: imageUrl(item.images?.fanart?.at(0), 'thumb'),
    released: releaseDate ? new Date(releaseDate) <= now : false,
    rating: item.rating ?? undefined,
    airedEpisodes: related.type === 'show' ? (related.item.aired_episodes ?? undefined) : undefined,
    runtime: item.runtime ?? undefined,
  };
}

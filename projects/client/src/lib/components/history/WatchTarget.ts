import type { RatingTarget } from '../rating/RatingTarget.ts';

/** Seasons carry their parent since progress and the overlay key them by show and season number. */
export type WatchTarget = RatingTarget & {
  season?: { show: number; number: number; episode?: number };
  airedEpisodes?: number;
  runtime?: number;
  /** Aired episode ids in broadcast order, when the page already has them. */
  episodeIds?: readonly number[];
};

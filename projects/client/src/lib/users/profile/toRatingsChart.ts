import { RATING_LABELS } from '../../components/rating/ratingPrompt.ts';

/** The profile's Ratings chart (`users.js:416-490`): ten bars and the help line's totals. */
export type RatingsChart = {
  /** "184", bold in "184 ratings with an average of 7.70 hearts." */
  readonly count: string;
  /** "7.70". */
  readonly average: string;
  /** Ratings 1 to 10, empty when there are none: OG hid the chart and kept the heading and help line. */
  readonly bars: readonly RatingBar[];
};

export type RatingBar = {
  readonly rating: number;
  readonly count: number;
  /** "8 — Great". */
  readonly label: string;
  /** Height as a share of the chart, 0 to 100. */
  readonly height: number;
  /** The most rated bar, which OG drew in its own color. */
  readonly top: boolean;
};

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/**
 * `ratings.distribution` from `/users/:id/stats` as the chart. The scale tops out at OG's `ceil(max / 10) * 11`
 * (yirChart), so the tallest bar never quite reaches the top.
 */
export function toRatingsChart(
  distribution: Readonly<Record<string, number>> | undefined,
  { showEmpty = false } = {},
): RatingsChart {
  const counts = RATINGS.map((rating) => distribution?.[rating] ?? 0);
  const count = counts.reduce((sum, n) => sum + n, 0);
  const total = counts.reduce((sum, n, i) => sum + n * (i + 1), 0);
  const max = Math.max(...counts);
  const scale = Math.ceil(max / 10) * 11;

  return {
    count: count.toLocaleString('en-US'),
    average: count > 0 ? (total / count).toFixed(2) : '0',
    bars: count > 0 || showEmpty
      ? RATINGS.map((rating, i) => {
        const n = counts.at(i) ?? 0;
        return {
          rating,
          count: n,
          label: `${rating} — ${RATING_LABELS[rating]}`,
          height: scale > 0 ? (n / scale) * 100 : 0,
          top: max > 0 && n === max,
        };
      })
      : [],
  };
}

/** OG's label for each rating, 1 to 10. */
export const RATING_LABELS: Readonly<Record<number, string>> = {
  1: 'Weak Sauce :(',
  2: 'Terrible',
  3: 'Bad',
  4: 'Poor',
  5: 'Meh',
  6: 'Fair',
  7: 'Good',
  8: 'Great',
  9: 'Superb',
  10: 'Totally Ninja!',
};

/** The rating popover's title: `strong` is bold, `text` follows it. */
export interface RatingPrompt {
  readonly strong: string;
  readonly text: string;
}

/**
 * What OG's rating popover title says (global.js `.quick-icons .percentage`): "Unrate" while pointing at the current
 * rating, "7 — Good" while pointing at another one or at rest on a rating, "What do you think?" when there's none.
 */
export function ratingPrompt(value: number | null, preview: number | null): RatingPrompt {
  if (preview !== null && preview === value) return { strong: 'Unrate', text: '' };

  const shown = preview ?? value;
  if (shown === null) return { strong: '', text: 'What do you think?' };

  return { strong: String(shown), text: ` — ${RATING_LABELS[shown]}` };
}

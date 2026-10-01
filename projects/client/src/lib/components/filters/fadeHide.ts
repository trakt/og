import type { OverlayState } from '../../overlay/createOverlay.svelte.ts';
import type { QuickIconFill } from '../media/quickIconFill.ts';

/** OG's fade and hide options, in menu order. */
export const fadeHideOptions = [
  { id: 'watched', label: 'Watched' },
  { id: 'watching', label: 'Partially Watched', showsOnly: true },
  { id: 'unwatched', label: 'Not Watched' },
  { id: 'collected', label: 'In Library' },
  { id: 'collecting', label: 'Partially In Library', showsOnly: true },
  { id: 'uncollected', label: 'Not In Library' },
  { id: 'watchlisted', label: 'Watchlisted' },
  { id: 'unwatchlisted', label: 'Not Watchlisted' },
  { id: 'listed', label: 'Listed' },
  { id: 'unlisted', label: 'Not Listed' },
  { id: 'rated', label: 'Rated' },
  { id: 'unrated', label: 'Not Rated' },
] as const;

export type FadeHideOption = (typeof fadeHideOptions)[number]['id'];

export type FadeHide = { fade: FadeHideOption[]; hide: FadeHideOption[] };

const ids: ReadonlySet<string> = new Set(fadeHideOptions.map(({ id }) => id));

/** Reads a comma list, like the `filter-fade-shows` cookie, dropping anything that isn't an option. */
export function parseFadeHide(value: string | undefined): FadeHideOption[] {
  return (value ?? '').split(',').filter((id): id is FadeHideOption => ids.has(id));
}

// A share of 1 is all of it, above 0 is some. OG read the same off the quick icons' `data-percentage`.
const share = (known: unknown, value: number, want: 'all' | 'some' | 'none') =>
  known !== undefined && (want === 'all' ? value === 1 : want === 'some' ? value > 0 && value < 1 : value === 0);

/**
 * Whether an item's user state matches one option (OG's `filterSet`, `global.js:3656-3710`). A slice that isn't
 * loaded yet matches nothing, so the "Not" options don't fade or hide everything while the overlay loads.
 */
export function matchesFadeHide(option: FadeHideOption, state: OverlayState, fill: QuickIconFill): boolean {
  switch (option) {
    case 'watched':
      return share(state.watched, fill.watched, 'all');
    case 'watching':
      return share(state.watched, fill.watched, 'some');
    case 'unwatched':
      return share(state.watched, fill.watched, 'none');
    case 'collected':
      return share(state.collected, fill.collected, 'all');
    case 'collecting':
      return share(state.collected, fill.collected, 'some');
    case 'uncollected':
      return share(state.collected, fill.collected, 'none');
    case 'watchlisted':
      return state.watchlisted === true;
    case 'unwatchlisted':
      return state.watchlisted === false;
    case 'listed':
      return state.listed === true;
    case 'unlisted':
      return state.listed === false;
    case 'rated':
      return typeof state.rating === 'number';
    case 'unrated':
      return state.rating === null;
  }
}

/** The hide options the chart endpoints run themselves, as `ignore_watched` and `ignore_watchlisted` (`loadChart`). */
export const apiHideOptions: readonly FadeHideOption[] = ['watched', 'watchlisted'];

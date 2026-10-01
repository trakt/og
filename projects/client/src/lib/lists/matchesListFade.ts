import { fadeHideOptions, matchesFadeHide } from '../components/filters/fadeHide.ts';
import type { OverlayState } from '../overlay/createOverlay.svelte.ts';
import type { QuickIconFill } from '../components/media/quickIconFill.ts';

/** Notes are list data; the other fade choices use the same overlay state as charts. */
export function matchesListFade({ option, notes, state, fill }: {
  option: string;
  notes?: string;
  state: OverlayState;
  fill: QuickIconFill;
}) {
  if (option === 'notes') return Boolean(notes?.trim());
  if (option === 'nonotes') return !notes?.trim();
  const known = fadeHideOptions.find(({ id }) => id === option);
  return known ? matchesFadeHide(known.id, state, fill) : false;
}

import { matchesFadeHide } from '../components/filters/fadeHide.ts';
import { quickIconFill } from '../components/media/quickIconFill.ts';
import type { OverlayState } from '../overlay/createOverlay.svelte.ts';
import type { creditHideOptions } from './creditHideOptions.ts';
import type { PersonCredit } from './PersonCredit.ts';

/** Release and character filters work without a viewer; state filters wait for their overlay slice. */
export function matchesCreditFilter({ option, credit, state }: {
  option: (typeof creditHideOptions)[number]['id'];
  credit: PersonCredit;
  state: OverlayState;
}) {
  const dated = credit.sortBy.released !== '3000-01-01';
  switch (option) {
    case 'released':
      return dated && credit.released;
    case 'unreleased':
      return dated && !credit.released;
    case 'noreleasedate':
      return !dated;
    case 'self':
      return /self|archive|bond/i.test(credit.characters);
    default:
      return matchesFadeHide(option, state, quickIconFill({ state, airedEpisodes: credit.airedEpisodes }));
  }
}

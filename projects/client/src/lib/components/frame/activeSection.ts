type Section = { readonly id: string; readonly top: number };

type ActiveSectionParams = {
  /** The sections in page order, each with its top edge relative to the viewport. */
  sections: readonly Section[];
  /** How far down the viewport a section counts as reached: the fixed header's height. */
  offset: number;
  /** Scrolled to the very bottom, where the last section may never reach the offset. */
  atBottom: boolean;
};

// Half a pixel either way, for fractional scroll positions.
const SLACK = 1;

/**
 * The section a scrollspy highlights, like Bootstrap's: the last one whose top has scrolled up to `offset`, the last
 * one at the bottom of the page, and none above the first.
 */
export function activeSection({ sections, offset, atBottom }: ActiveSectionParams): string | undefined {
  if (atBottom) return sections.at(-1)?.id;

  return sections.findLast(({ top }) => top <= offset + SLACK)?.id;
}

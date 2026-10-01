import type { DarkKnight } from './DarkKnight.ts';
import type { Theme } from './Theme.ts';

const THEMES: Readonly<Record<DarkKnight, Theme>> = { false: 'light', true: 'dark', auto: 'system' };

/** The `data-theme` that renders a Dark Knight setting. */
export function toTheme(darkKnight: DarkKnight): Theme {
  return THEMES[darkKnight];
}

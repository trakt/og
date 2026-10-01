import type { DarkKnight } from './DarkKnight.ts';

type ShowsDarkParams = {
  readonly darkKnight: DarkKnight;
  /** Whether the system appearance is dark, which decides what Auto shows. */
  readonly prefersDark: boolean;
};

/** Whether a Dark Knight setting renders the page dark: On, or Auto on a dark system. */
export function showsDark({ darkKnight, prefersDark }: ShowsDarkParams): boolean {
  return darkKnight === 'true' || (darkKnight === 'auto' && prefersDark);
}

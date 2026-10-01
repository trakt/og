import { formatRuntime } from '../../utils/formatRuntime.ts';
import type { ProgressSeasonData } from './ProgressItem.ts';
import type { ProgressType } from './progressTypes.ts';

export type StripCellState = 'watched' | 'not-watched' | 'up-next' | 'not-aired';

export type StripCell = {
  /** "3x01", which also keys the cell. */
  readonly code: string;
  readonly href: string;
  readonly state: StripCellState;
  /** `3x01 "Title", up next`: the cell's accessible name and the readout. */
  readonly label: string;
};

export type StripSeason = {
  readonly number: number;
  /** "S1", or "SP" for specials. */
  readonly label: string;
  /** "Season 1 episodes", for the list. */
  readonly name: string;
  readonly cells: readonly StripCell[];
  /** Every aired episode is done: the count gets a check. */
  readonly complete: boolean;
  /** "22/22", "11/25 · 5h 8m left" or "3 announced". */
  readonly count: string;
};

export type StripTick = { readonly text: string; readonly mark: boolean };

/** The fitted season strips under an open progress row. */
export type ProgressStrips = {
  /** The longest season's episode count: every row sits on this many columns. */
  readonly columns: number;
  readonly seasons: readonly StripSeason[];
  /** The ruler under the strips: 1, 5, 10… and the up-next column as "▲ 13". */
  readonly ticks: readonly StripTick[];
};

type ToProgressStripsParams = {
  seasons: readonly ProgressSeasonData[];
  /** The up-next episode, by season and number. */
  next?: { readonly season: number; readonly number: number };
  showHref: string;
  type: ProgressType;
};

const WATCHED_WORDS: Record<StripCellState, string> = {
  watched: 'watched',
  'not-watched': 'not watched',
  'up-next': 'up next',
  'not-aired': 'not aired',
};
const LIBRARY_WORDS = { ...WATCHED_WORDS, watched: 'in your library', 'not-watched': 'not in your library' };

const code = (season: number, number: number) => `${season}x${String(number).padStart(2, '0')}`;

function seasonCount(season: ProgressSeasonData, type: ProgressType): string {
  if (season.aired === 0) return `${season.upcoming.length} announced`;
  const done = `${season.completed}/${season.aired}`;
  if (type === 'library' || season.completed >= season.aired) return done;
  return `${done} · ${formatRuntime(season.minutesLeft)} left`;
}

/** Maps an open row's seasons onto the strips: one cell an episode, aired or announced, in number order. */
export function toProgressStrips({ seasons, next, showHref, type }: ToProgressStripsParams): ProgressStrips {
  const words = type === 'library' ? LIBRARY_WORDS : WATCHED_WORDS;
  const rows = seasons.map((season): StripSeason => {
    const episodes = [
      ...season.episodes.map(({ number, title, done }) => ({ number, title, aired: true, done })),
      ...season.upcoming.map(({ number, title }) => ({ number, title, aired: false, done: false })),
    ].toSorted((a, b) => a.number - b.number);

    const cells = episodes.map(({ number, title, aired, done }): StripCell => {
      const state: StripCellState = !aired
        ? 'not-aired'
        : done
        ? 'watched'
        : next?.season === season.number && next.number === number
        ? 'up-next'
        : 'not-watched';
      const episode = code(season.number, number);
      return {
        code: episode,
        href: `${showHref}/seasons/${season.number}/episodes/${number}`,
        state,
        label: `${episode}${title ? ` "${title}"` : ''}, ${words[state]}`,
      };
    });

    return {
      number: season.number,
      label: season.number === 0 ? 'SP' : `S${season.number}`,
      name: `${season.number === 0 ? 'Specials' : `Season ${season.number}`} episodes`,
      cells,
      complete: season.aired > 0 && season.completed >= season.aired,
      count: seasonCount(season, type),
    };
  });

  const columns = Math.max(0, ...rows.map(({ cells }) => cells.length));
  const marked = rows.flatMap(({ cells }) => cells.findIndex(({ state }) => state === 'up-next')).find((i) => i >= 0);
  const ticks = Array.from({ length: columns }, (_, index): StripTick => {
    const column = index + 1;
    if (index === marked) return { text: `▲ ${column}`, mark: true };
    return { text: column === 1 || column % 5 === 0 ? String(column) : '', mark: false };
  });

  return { columns, seasons: rows, ticks };
}

import type { DatePreferences } from '../../settings/DatePreferences.ts';
import { formatDate } from '../../utils/formatDate.ts';
import { formatRuntime } from '../../utils/formatRuntime.ts';
import type { ProgressSeasonData } from './ProgressItem.ts';
import type { ProgressType } from './progressTypes.ts';

export type EpisodeTileState = 'watched' | 'not-watched' | 'up-next' | 'not-aired';

export type EpisodeTile = {
  readonly number: number;
  /** "3x01", which also keys the tile. */
  readonly code: string;
  readonly title?: string;
  readonly href: string;
  readonly state: EpisodeTileState;
  /** The line under the title: "✓ Sep 29", "up next", "Sep 29, 2026" or "airs Jan 14, 2027". */
  readonly note: string;
  /** `3x01 "Title", watched Sep 29, 2026`: the tile's accessible name. */
  readonly label: string;
  /** "Title · Sep 29, 2026 · 52m · 81% · watched": the readout after the code. */
  readonly readout: string;
};

export type SeasonPick = {
  readonly number: number;
  /** "Season 1", or "Specials". */
  readonly name: string;
  /** The picker's count: "11/25", "25" once done (with a check), or "soon" when nothing has aired. */
  readonly count: string;
  readonly complete: boolean;
  /** Done of aired, 0 to 100, for the picker's bar. */
  readonly percent: number;
  /** "11/25 · 5h 8m left", "22/22" or "3 announced", next to the season's heading. */
  readonly summary: string;
  readonly tiles: readonly EpisodeTile[];
};

/** An open progress row's seasons, for the picker and its episode tiles. */
export type SeasonPicker = {
  readonly seasons: readonly SeasonPick[];
  /** The season it opens on: up next's, else the last one with anything done, else the first. */
  readonly selected: number;
};

type ToSeasonPickerParams = {
  seasons: readonly ProgressSeasonData[];
  /** The up-next episode, by season and number. */
  next?: { readonly season: number; readonly number: number };
  showHref: string;
  type: ProgressType;
  datePreferences: DatePreferences;
};

const UNKNOWN_DATE = Date.parse('1970-01-01T00:00:00Z');
const code = (season: number, number: number) => `${season}x${String(number).padStart(2, '0')}`;

function summary(season: ProgressSeasonData, type: ProgressType): string {
  if (season.aired === 0) return `${season.upcoming.length} announced`;
  const done = `${season.completed}/${season.aired}`;
  if (type === 'library' || season.completed >= season.aired) return done;
  return `${done} · ${formatRuntime(season.minutesLeft)} left`;
}

type Episode = {
  number: number;
  title?: string;
  firstAired?: string;
  runtime?: number;
  rating?: number;
  aired: boolean;
  done: boolean;
  at?: string;
};

function toTile(
  { season, episode, next, showHref, type, datePreferences }:
    & Omit<ToSeasonPickerParams, 'seasons'>
    & { season: number; episode: Episode },
): EpisodeTile {
  const { number, title, firstAired, runtime, rating, aired, done, at } = episode;
  const state: EpisodeTileState = !aired
    ? 'not-aired'
    : done
    ? 'watched'
    : next?.season === season && next.number === number
    ? 'up-next'
    : 'not-watched';
  const day = (date: string | undefined, format: 'l' | 'll' = 'll') =>
    date && Date.parse(date) !== UNKNOWN_DATE ? formatDate(date, { ...datePreferences, format }) : undefined;
  const airs = day(firstAired) ?? 'TBA';
  const doneWord = type === 'library' ? 'in your library' : 'watched';
  const status = {
    watched: [doneWord, day(at)].filter(Boolean).join(type === 'library' ? ', added ' : ' '),
    'not-watched': type === 'library' ? 'not in your library' : 'not watched',
    'up-next': 'up next',
    'not-aired': `airs ${airs}`,
  }[state];
  const note = {
    watched: `✓ ${day(at, 'l') ?? doneWord}`,
    'not-watched': airs,
    'up-next': 'up next',
    'not-aired': `airs ${airs}`,
  }[state];
  const episodeCode = code(season, number);

  return {
    number,
    code: episodeCode,
    title,
    href: `${showHref}/seasons/${season}/episodes/${number}`,
    state,
    note,
    label: [`${episodeCode}${title ? ` "${title}"` : ''}`, status, aired && state !== 'watched' && `aired ${airs}`]
      .filter(Boolean).join(', '),
    readout: [
      title,
      aired && airs,
      runtime ? formatRuntime(runtime) : undefined,
      rating !== undefined && `${Math.trunc(rating * 10)}%`,
      status,
    ].filter(Boolean).join(' · '),
  };
}

/** The season the panel opens on: up next's, else the last season with anything done, else the first. */
function selected(seasons: readonly ProgressSeasonData[], next: ToSeasonPickerParams['next']): number {
  if (next && seasons.some(({ number }) => number === next.season)) return next.season;
  return seasons.findLast(({ completed }) => completed > 0)?.number ??
    seasons.find(({ number }) => number > 0)?.number ?? seasons.at(0)?.number ?? 1;
}

/** Maps an open row's seasons onto the picker: a count and bar a season, and a tile an episode, aired or announced. */
export function toSeasonPicker(params: ToSeasonPickerParams): SeasonPicker {
  const { seasons, next } = params;
  return {
    selected: selected(seasons, next),
    seasons: seasons.map((season): SeasonPick => {
      const complete = season.aired > 0 && season.completed >= season.aired;
      const episodes: readonly Episode[] = [
        ...season.episodes.map((episode) => ({ ...episode, aired: true })),
        ...season.upcoming.map((episode) => ({ ...episode, aired: false, done: false })),
      ].toSorted((a, b) => a.number - b.number);

      return {
        number: season.number,
        name: season.number === 0 ? 'Specials' : `Season ${season.number}`,
        count: season.aired === 0 ? 'soon' : complete ? String(season.aired) : `${season.completed}/${season.aired}`,
        complete,
        percent: season.aired === 0 ? 0 : Math.round(season.completed / season.aired * 100),
        summary: summary(season, params.type),
        tiles: episodes.map((episode) => toTile({ ...params, season: season.number, episode })),
      };
    }),
  };
}

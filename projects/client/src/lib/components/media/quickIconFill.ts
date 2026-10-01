import { collectionMetadataLabel } from '../collection/collectionMetadataLabel.ts';
import type { OverlayState } from '../../overlay/createOverlay.svelte.ts';
import { countLabel } from '../../utils/countLabel.ts';
import { formatDate, type FormatDateOptions } from '../../utils/formatDate.ts';
import { formatRuntime } from '../../utils/formatRuntime.ts';

/** How each quick icon renders. `watched` and `collected` are 0 to 1: shows and seasons fill in proportion. */
export type QuickIconFill = {
  watched: number;
  collected: number;
  listed: boolean;
  favorited: boolean;
  rewatching: boolean;
  /** The done-state tooltips, one line per `\n`. Left out, the icon keeps its idle "Add to ..." tooltip. */
  titles: Partial<Record<'watched' | 'collected' | 'listed' | 'favorited', string>>;
};

type QuickIconFillParams = {
  state: OverlayState;
  /** Shows and seasons: the aired episode count, so partial progress fills the icon partway. */
  airedEpisodes?: number;
  /** Minutes, so a movie's tooltip can total its plays. */
  runtime?: number;
  /** Seasons say "collected" where shows say "in library". */
  season?: boolean;
  /** The viewer's shared layout datePreferences. */
  adjustRewatching?: boolean;
  datePreferences?: Pick<FormatDateOptions, 'order' | 'hour24' | 'timeZone'>;
};

const fraction = (done: number | undefined, total: number | undefined, whole: boolean | undefined) => {
  if (done !== undefined && total) return Math.min(done / total, 1);
  return whole ? 1 : 0;
};

// OG's show and season tooltips (`global.js:830-892`): "60% watched", "12/20 episodes", "8 remaining".
function progressTitle(done: number | undefined, aired: number | undefined, verb: string, includeZero = false) {
  if (done === undefined || (!done && !includeZero) || !aired) return undefined;
  const left = aired - done;
  return [
    `${Math.floor(Math.min(done / aired, 1) * 100)}% ${verb}`,
    `${done}/${countLabel(aired, 'episode')}`,
    ...(left > 0 ? [`${left.toLocaleString('en-US')} remaining`] : []),
  ].join('\n');
}

function watchedTitle(params: QuickIconFillParams, includeZero = false): string | undefined {
  const { state, airedEpisodes, runtime } = params;
  if (!state.plays) {
    if (state.rewatching && state.rewatchedEpisodes !== undefined) {
      const full = watchedTitle({ ...params, state: { ...state, rewatching: false } });
      const rewatch = watchedTitle({
        ...params,
        state: {
          ...state,
          rewatching: false,
          watchedEpisodes: state.rewatchedEpisodes,
          watchedPlays: state.rewatchedPlays,
        },
      }, true);
      return [rewatch?.replace('watched', 'rewatched'), full].filter(Boolean).join('\n\n') || undefined;
    }
    const progress = progressTitle(state.watchedEpisodes, airedEpisodes, 'watched', includeZero);
    if (!progress || state.watchedPlays === undefined) return progress;
    const lines = progress.split('\n');
    const remaining = Math.max((airedEpisodes ?? 0) - (state.watchedEpisodes ?? 0), 0);
    return [
      ...lines.slice(0, 2),
      `${countLabel(state.watchedPlays, 'play')}${runtime ? ` (${formatRuntime(state.watchedPlays * runtime)})` : ''}`,
      ...(remaining ? [`${remaining} remaining${runtime ? ` (${formatRuntime(remaining * runtime)})` : ''}`] : []),
    ].join('\n');
  }
  return [countLabel(state.plays, 'play'), ...(runtime ? [formatRuntime(state.plays * runtime)] : [])].join('\n');
}

function collectedTitle({ state, airedEpisodes, season, datePreferences }: QuickIconFillParams) {
  if (state.collectedAt) {
    return [
      state.collectedAt.startsWith('1970-01-01')
        ? 'Added to library on\nUnknown date'
        : `Added to library on\n${formatDate(state.collectedAt, datePreferences)}`,
      collectionMetadataLabel(state.collectionMetadata),
    ].filter(Boolean).join('\n');
  }
  return progressTitle(state.collectedEpisodes, airedEpisodes, season ? 'collected' : 'in library');
}

// OG: "Manage lists" once anything is in a personal list, else "Remove from watchlist".
function listedTitle({ state }: QuickIconFillParams) {
  if (state.listed) return 'Manage lists';
  return state.watchlisted ? 'Remove from watchlist' : undefined;
}

/** Maps a poster's overlay state onto the quick-icon bar. Unknown state renders idle. */
export function quickIconFill(params: QuickIconFillParams): QuickIconFill {
  const { state, airedEpisodes } = params;
  const titles: QuickIconFill['titles'] = {
    watched: watchedTitle(params),
    collected: collectedTitle(params),
    listed: listedTitle(params),
    favorited: state.favorited
      ? state.favoritedAt
        ? `Favorited on\n${formatDate(state.favoritedAt, { ...params.datePreferences, time: true })}`
        : 'Favorited'
      : undefined,
  };

  return {
    watched: fraction(
      params.adjustRewatching !== false && state.rewatching
        ? state.rewatchedEpisodes ?? state.watchedEpisodes
        : state.watchedEpisodes,
      airedEpisodes,
      state.watched,
    ),
    collected: fraction(state.collectedEpisodes, airedEpisodes, state.collected),
    // OG lit the list icon for the watchlist and for personal lists alike.
    listed: Boolean(state.watchlisted || state.listed),
    favorited: Boolean(state.favorited),
    rewatching: Boolean(state.rewatching),
    titles,
  };
}

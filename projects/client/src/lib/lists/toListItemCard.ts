import type { SeasonOf } from '../overlay/createOverlay.svelte.ts';
import { episodeNumber } from '../components/media/episodeTags.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { formatDate } from '../utils/formatDate.ts';
import { formatRuntime } from '../utils/formatRuntime.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import { episodeBadge } from '../users/profile/toProfileSummary.ts';
import type { ListItemRow } from './listItemRowsSchema.ts';

type Link = { readonly text: string; readonly href: string };
/** The Trakt rating line: the heart, "72%" and the votes. */
type RatingLine = { readonly rating: number; readonly votes: number; readonly href: string };
export type ListCardLine = Link | RatingLine;

/** One poster on a list page. */
export interface ListItemCard {
  /** The list item's id: unique on the list, where a movie is listed once. */
  readonly key: number;
  readonly type: ListItemRow['type'];
  /** The item's trakt id, for the overlay. */
  readonly id: number;
  readonly href: string;
  readonly title: string;
  /** An episode's "2x04". */
  readonly number?: string;
  readonly image?: string;
  readonly rank: number;
  /** The Trakt rating, 0 to 10. */
  readonly rating?: number;
  readonly airedEpisodes?: number;
  readonly seasonOf?: SeasonOf;
  readonly episodeBadge?: ReturnType<typeof episodeBadge>;
  /** OG's two lines under the title, `under_title` and `under_title2`. A blank one is a non-breaking space. */
  readonly lines: readonly [ListCardLine, ListCardLine];
  /** The owner's notes on the item, markdown with emoji. */
  readonly notes?: string;
  /** The notes modal's title band: a show's name over an episode, and the fanart. */
  readonly noteTitle: {
    readonly title: string;
    readonly year?: number;
    readonly show?: string;
    readonly fanart?: string;
  };
}

type Options = { sortBy: string; datePreferences: DatePreferences };

// OG's `under_title = '&nbsp;'`: an empty line keeps every card the same height.
const BLANK = ' ';
const showHref = (slug: string) => `/shows/${slug}`;
// OG's notes modal swapped the fanart's `full` for `thumb` (`lists.js:1352`).
const fanart = (images?: { fanart?: string[] | null } | null) => imageUrl(images?.fanart?.at(0), 'thumb');

type Facts = {
  listedAt: string;
  /** A bare date (a movie's `released`), shown as the day it names. */
  releasedDate?: string | null;
  /** An instant, shown in the viewer's zone. */
  firstAired?: string | null;
  runtime?: number | null;
  /** Left out for people, who have no rating line. OG shows an unrated item as 0%. */
  rating?: number;
  votes?: number | null;
};

/** The line OG put under the title for the sort, or undefined for none. */
function sortLine(sortBy: string, facts: Facts, href: string, datePreferences: DatePreferences) {
  switch (sortBy) {
    case 'added':
      return formatDate(facts.listedAt, { ...datePreferences, time: true });
    case 'released':
      if (facts.releasedDate) return formatDate(facts.releasedDate, { ...datePreferences, timeZone: 'UTC' });
      return facts.firstAired ? formatDate(facts.firstAired, datePreferences) : undefined;
    case 'runtime':
      return facts.runtime ? formatRuntime(facts.runtime) : undefined;
    case 'popularity':
    case 'percentage':
    case 'votes':
      return facts.rating === undefined ? undefined : { rating: facts.rating, votes: facts.votes ?? 0, href };
    default:
      // The external ratings and "Your data" dates aren't on list items (see the PR's API gaps).
      return undefined;
  }
}

const text = (value: string | undefined, href: string): Link => ({ text: value ?? BLANK, href });

/**
 * OG's two lines: a season or episode puts its show first, linking to the show, then the sorted line; everything
 * else puts the sorted line first.
 */
function lines(
  { top, sorted, href }: { top?: Link; sorted?: string | RatingLine; href: string },
): readonly [ListCardLine, ListCardLine] {
  const line = (value: string | RatingLine | undefined) => typeof value === 'object' ? value : text(value, href);
  return top ? [top, line(sorted)] : [line(sorted), text(undefined, href)];
}

/** A list item as a poster card. */
export function toListItemCard(row: ListItemRow, { sortBy, datePreferences }: Options): ListItemCard {
  const base = { key: row.id, rank: row.rank, ...(row.notes?.trim() && { notes: row.notes.trim() }) };
  const sorted = (facts: Omit<Facts, 'listedAt'>, href: string) =>
    sortLine(sortBy, { ...facts, listedAt: row.listed_at }, href, datePreferences);

  switch (row.type) {
    case 'movie': {
      const { movie } = row;
      const href = `/movies/${movie.ids.slug}`;
      return {
        ...base,
        type: 'movie',
        id: movie.ids.trakt,
        href,
        title: movie.title,
        image: imageUrl(movie.images?.poster?.at(0), 'thumb'),
        rating: movie.rating ?? undefined,
        noteTitle: { title: movie.title, year: movie.year ?? undefined, fanart: fanart(movie.images) },
        lines: lines({
          sorted: sorted({ ...movie, rating: movie.rating ?? 0, releasedDate: movie.released }, href),
          href,
        }),
      };
    }
    case 'show': {
      const { show } = row;
      const href = showHref(show.ids.slug);
      return {
        ...base,
        type: 'show',
        id: show.ids.trakt,
        href,
        title: show.title,
        image: imageUrl(show.images?.poster?.at(0), 'thumb'),
        rating: show.rating ?? undefined,
        airedEpisodes: show.aired_episodes ?? undefined,
        noteTitle: { title: show.title, year: show.year ?? undefined, fanart: fanart(show.images) },
        lines: lines({
          sorted: sorted({
            ...show,
            rating: show.rating ?? 0,
            firstAired: show.first_aired,
            runtime: show.total_runtime,
          }, href),
          href,
        }),
      };
    }
    case 'season': {
      const { show, season } = row;
      const href = `${showHref(show.ids.slug)}/seasons/${season.number}`;
      const name = season.number === 0 ? 'Specials' : `Season ${season.number}`;
      // `item_title(season_title: true)`: a season with its own name reads "2: The Name".
      const title = season.title && season.title !== name ? `${season.number}: ${season.title}` : name;
      return {
        ...base,
        type: 'season',
        id: season.ids.trakt,
        href,
        title,
        image: imageUrl((season.images?.poster ?? show.images?.poster)?.at(0), 'thumb'),
        rating: season.rating ?? undefined,
        airedEpisodes: season.aired_episodes ?? undefined,
        seasonOf: { show: show.ids.trakt, number: season.number },
        noteTitle: { title: `${show.title}: ${name}`, fanart: fanart(show.images) },
        lines: lines({
          top: { text: show.title, href: showHref(show.ids.slug) },
          sorted: sorted({
            ...season,
            rating: season.rating ?? 0,
            firstAired: season.first_aired,
            runtime: season.total_runtime,
          }, href),
          href,
        }),
      };
    }
    case 'episode': {
      const { show, episode } = row;
      const href = `${showHref(show.ids.slug)}/seasons/${episode.season}/episodes/${episode.number}`;
      return {
        ...base,
        type: 'episode',
        id: episode.ids.trakt,
        href,
        title: episode.title ?? '',
        number: episodeNumber(episode, show.genres),
        image: imageUrl(show.images?.poster?.at(0), 'thumb'),
        rating: episode.rating ?? undefined,
        seasonOf: { show: show.ids.trakt, number: episode.season, episode: episode.number },
        noteTitle: {
          title: `${episodeNumber(episode, show.genres)} ${episode.title ?? ''}`.trim(),
          show: show.title,
          fanart: fanart(show.images),
        },
        episodeBadge: episodeBadge(episode),
        lines: lines({
          top: { text: show.title, href: showHref(show.ids.slug) },
          sorted: sorted({ ...episode, rating: episode.rating ?? 0, firstAired: episode.first_aired }, href),
          href,
        }),
      };
    }
    case 'person': {
      const { person } = row;
      const href = `/people/${person.ids.slug}`;
      return {
        ...base,
        type: 'person',
        id: person.ids.trakt,
        href,
        title: person.name,
        image: imageUrl(person.images?.headshot?.at(0), 'thumb'),
        noteTitle: { title: person.name, fanart: fanart(person.images) },
        lines: lines({ sorted: sorted({}, href), href }),
      };
    }
  }
}

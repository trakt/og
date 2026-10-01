import type {
  MovieResponse,
  PeopleMovieCreditsResponse,
  PeopleShowCreditsResponse,
  PersonResponse,
  ShowResponse,
} from '@trakt/api';
import { titleize } from '../components/summary/names.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { PersonCredit } from './PersonCredit.ts';
import { personLinks } from './personLinks.ts';

interface PersonSummaryParams {
  person: PersonResponse;
  movies: PeopleMovieCreditsResponse | null;
  shows: PeopleShowCreditsResponse | null;
  /** `X-Pagination-Item-Count` of the person's lists. */
  listCount: number;
  /** The viewer's "display early ratings" setting. */
  earlyRatings: boolean;
  /** 0 to 1, picks the fanart. OG picked one at random on every page view. */
  random: number;
  now: Date;
}

type Media = { type: 'movie'; item: MovieResponse } | { type: 'show'; item: ShowResponse };

/** One API credit before it's grouped: which department, which item, and the characters or jobs. */
type RawCredit = Media & { role: string; names: readonly string[]; episodeCount: number };

// API's `parameterize`: the tab ids and OG's `#default-tab`.
const parameterize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Every credit in API order: movie cast, movie crew, show cast, show crew. The cast is the "acting" department. */
function rawCredits({ movies, shows }: Pick<PersonSummaryParams, 'movies' | 'shows'>): RawCredit[] {
  const movie = (role: string, names: readonly string[], item: MovieResponse): RawCredit => ({
    type: 'movie',
    item,
    role,
    names,
    episodeCount: 0,
  });
  const show = (role: string, names: readonly string[], item: ShowResponse, episodes?: number | null): RawCredit => ({
    type: 'show',
    item,
    role,
    names,
    episodeCount: episodes ?? 0,
  });

  return [
    ...(movies?.cast ?? []).map((credit) => movie('acting', credit.characters, credit.movie)),
    ...Object.entries(movies?.crew ?? {}).flatMap(([role, crew]) =>
      crew.map((credit) => movie(role, credit.jobs, credit.movie))
    ),
    ...(shows?.cast ?? []).map((credit) => show('acting', credit.characters, credit.show, credit.episode_count)),
    ...Object.entries(shows?.crew ?? {}).flatMap(([role, crew]) =>
      crew.map((credit) => show(role, credit.jobs, credit.show, credit.episode_count))
    ),
  ];
}

const sortTitle = (title: string) => title.toLowerCase().replace(/^(the |an |a )/, '');

function toCredit(credit: RawCredit, { earlyRatings, now }: Pick<PersonSummaryParams, 'earlyRatings' | 'now'>) {
  const date = credit.type === 'movie' ? credit.item.released : credit.item.first_aired;
  const released = !!date && new Date(date) <= now;
  const { item } = credit;
  const airedEpisodes = credit.type === 'show' ? (credit.item.aired_episodes ?? undefined) : undefined;
  const runtime = item.runtime ?? undefined;
  const status = credit.type === 'movie' && !released && item.status ? titleize(item.status) : undefined;

  return {
    type: credit.type,
    id: item.ids.trakt,
    href: `/${credit.type}s/${item.ids.slug}`,
    title: item.title,
    year: item.year ?? undefined,
    image: imageUrl(item.images?.poster?.at(0), 'thumb'),
    rating: released || earlyRatings ? (item.rating ?? undefined) : undefined,
    released,
    status,
    episodeCount: credit.episodeCount,
    // API's `credits_characters`, after the uniq it ran over them.
    characters: [...new Set(credit.names.filter(Boolean))].join(', '),
    airedEpisodes,
    runtime,
    sortBy: {
      released: date ?? '3000-01-01',
      title: sortTitle(item.title),
      percentage: Math.trunc((item.rating ?? 0) * 10),
      votes: item.votes ?? 0,
      runtime: (runtime ?? 0) * (airedEpisodes ?? 1),
      episodes: credit.episodeCount,
    },
  } satisfies PersonCredit;
}

/**
 * OG's department tabs: one per department, most credits first, each newest first.
 * The API lists a person once per item and department, so there's nothing to merge within a tab.
 */
function departments(credits: readonly RawCredit[], params: Pick<PersonSummaryParams, 'earlyRatings' | 'now'>) {
  const roles = [...new Set(credits.map(({ role }) => role))];
  return roles
    .map((role) => ({
      id: parameterize(role),
      label: titleize(role),
      credits: credits
        .filter((credit) => credit.role === role)
        .map((credit) => toCredit(credit, params))
        .toSorted((a, b) => b.sortBy.released.localeCompare(a.sortBy.released)),
    }))
    .toSorted((a, b) => b.credits.length - a.credits.length);
}

/**
 * OG's random fanart: up to 21 movie and 21 show credits with fanart, narrowed to
 * the person's known-for department when any match, then one at random. Its caption names the source.
 */
function fanart(credits: readonly RawCredit[], { person, random }: Pick<PersonSummaryParams, 'person' | 'random'>) {
  const withFanart = (type: RawCredit['type']) =>
    credits.filter((credit) => credit.type === type && credit.item.images?.fanart?.at(0)).slice(0, 21);
  const candidates = [...withFanart('movie'), ...withFanart('show')];
  const known = candidates.filter(({ role }) => role === person.known_for_department);
  const pool = known.length > 0 ? known : candidates;
  const pick = pool.at(Math.floor(random * pool.length));
  if (!pick) return undefined;

  return {
    image: imageUrl(pick.item.images?.fanart?.at(0), 'full'),
    characters: [...new Set(pick.names.filter(Boolean))].join(', '),
    role: titleize(pick.role),
    title: pick.item.title,
    year: pick.item.year ?? undefined,
    href: `/${pick.type}s/${pick.item.ids.slug}`,
  };
}

// Person#age: whole years to today, or to the day they died.
function age(birthday: string, death: string | null | undefined, now: Date) {
  const born = new Date(birthday);
  const end = death ? new Date(death) : now;
  const hadBirthday = end.getUTCMonth() > born.getUTCMonth() ||
    (end.getUTCMonth() === born.getUTCMonth() && end.getUTCDate() >= born.getUTCDate());
  return end.getUTCFullYear() - born.getUTCFullYear() - (hadBirthday ? 0 : 1);
}

function gender(value: string | null | undefined) {
  if (!value || value === 'unknown') return undefined;
  return value === 'non_binary' ? 'Non-binary' : titleize(value);
}

/** Everything the person summary shows, from the loader's API responses. Dates stay ISO; the page formats them. */
export function toPersonSummary(params: PersonSummaryParams) {
  const { person, now } = params;
  const credits = rawCredits(params);
  const tabs = departments(credits, params);
  const known = person.known_for_department ? parameterize(person.known_for_department) : undefined;

  return {
    updatedAt: person.updated_at ?? null,
    id: person.ids.trakt,
    slug: person.ids.slug,
    href: `/people/${person.ids.slug}`,
    name: person.name,
    headshot: imageUrl(person.images?.headshot?.at(0), 'medium'),
    fanart: fanart(credits, params),
    listCount: params.listCount,
    facts: {
      age: person.birthday ? age(person.birthday, person.death, now) : undefined,
      gender: gender(person.gender),
      birthday: person.birthday ?? undefined,
      death: person.death ?? undefined,
      birthplace: person.birthplace ?? undefined,
      knownFor: person.known_for_department ? titleize(person.known_for_department) : undefined,
    },
    biography: person.biography?.replace('From Wikipedia, the free encyclopedia.', '').replace(/\s+/g, ' ').trim() ||
      null,
    links: personLinks(person),
    departments: tabs,
    // OG opened the known-for tab, else the first.
    defaultDepartment: tabs.find(({ id }) => id === known)?.id ?? tabs.at(0)?.id,
  };
}

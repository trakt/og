import type { z } from 'zod/v4';
import { titleize } from '../components/summary/names.ts';
import type { seasonPeopleSchema } from '../shows/seasonPeopleSchema.ts';
import { countLabel } from '../utils/countLabel.ts';
import { imageUrl } from '../utils/imageUrl.ts';

type People = z.infer<typeof seasonPeopleSchema>;
type Member = NonNullable<People['cast']>[number];

/** One headshot card in a credits grid. */
export type CreditPerson = {
  readonly id: number;
  readonly name: string;
  readonly href: string;
  readonly image?: string;
  /** The characters or the jobs, joined: "Walter White, Heisenberg". */
  readonly role: string;
  /** Shows and seasons: "62 episodes". */
  readonly episodes?: string;
};

/** A pill tab: "Season Regulars 8", "Directing 3". */
export type CreditGroup = {
  readonly id: string;
  readonly label: string;
  readonly count: string;
  readonly people: readonly CreditPerson[];
};

type Params = {
  /** The actor tabs in OG's order, e.g. Season Regulars then Guest Stars. */
  actors: readonly { readonly label: string; readonly members: readonly Member[] | null | undefined }[];
  crew: People['crew'];
  /** Episodes and movies have no episode counts. */
  episodeCounts: boolean;
};

// these departments first, then the rest alphabetically.
const FIRST_DEPARTMENTS = ['created by', 'directing', 'writing', 'production'];
const rank = (department: string) => {
  const index = FIRST_DEPARTMENTS.indexOf(department);
  return index === -1 ? FIRST_DEPARTMENTS.length : index;
};

const parameterize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function group(
  label: string,
  members: readonly Member[],
  role: (member: Member) => readonly string[],
  counts: boolean,
) {
  return {
    id: parameterize(label),
    label,
    count: members.length.toLocaleString('en-US'),
    people: members.map((member) => ({
      id: member.person.ids.trakt,
      name: member.person.name,
      href: `/people/${member.person.ids.slug}`,
      image: imageUrl(member.images?.headshot?.at(0), 'thumb'),
      // `credits_characters`: "A / B" becomes "A, B".
      role: role(member).join(', '),
      episodes: counts && member.episode_count ? countLabel(member.episode_count, 'episode') : undefined,
    })),
  };
}

/** The credits page's actor and crew tabs. Empty tabs are left out. */
export function toCredits({ actors, crew, episodeCounts }: Params): {
  actors: CreditGroup[];
  crew: CreditGroup[];
} {
  return {
    actors: actors.filter(({ members }) => members?.length)
      .map(({ label, members }) => group(label, members ?? [], ({ characters }) => characters, episodeCounts)),
    crew: Object.entries(crew ?? {}).filter(([, members]) => members.length > 0)
      .toSorted(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([department, members]) => group(titleize(department), members, ({ jobs }) => jobs ?? [], episodeCounts)),
  };
}

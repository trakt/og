import type { ProfileResponse } from '@trakt/api';
import type { SocialRow } from './SocialRow.ts';

// OG's avatar for private members and members without one.
const PLACEHOLDER_AVATAR = 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png';

export type ActivityUser = {
  readonly key: string;
  /** The tooltip's first line, OG's `user.username`. */
  readonly name: string;
  /** Left out for private members, whose placeholder avatar isn't a link. */
  readonly href?: string;
  readonly avatar: string;
  /** Their rating of the item, 1 to 10: the ring colour and the corner badge. */
  readonly rating?: number;
  /** "3 plays" under the name in the watched tab's tooltip. */
  readonly plays?: number;
};

export type ActivityTab = {
  readonly id: 'watching' | 'watched' | 'rated';
  /** The big number: a count, or the average rating's percentage (no sign) for "Rated by". */
  readonly number: string;
  /** The two uppercase lines beside the number. */
  readonly text: readonly [string, string];
  /** "Rated by" only: the average's rating level, 1 to 10, which colours the heart before the percentage. */
  readonly heart?: number;
  readonly users: readonly ActivityUser[];
};

type ToActivityParams = {
  /** `/:type/:id/watching`: everyone watching right now. */
  watching: readonly ProfileResponse[];
  /** `/:type/:id/social`: the followed members' activity, or `null` when logged out. */
  social: readonly SocialRow[] | null;
};

const count = (value: number) => value.toLocaleString('en-US');
const people = (value: number) => (value === 1 ? 'Person' : 'People');

// A `/watching` profile or a `/social` row's member.
type Member = {
  readonly username: string;
  readonly private?: boolean | null;
  readonly ids: { readonly slug?: string | null };
  readonly images?: { readonly avatar?: { readonly full?: string | null } | null } | null;
};

function toUser(user: Member, index: number): ActivityUser {
  const slug = user.ids.slug;
  if (user.private || !slug) return { key: `private-${index}`, name: user.username, avatar: PLACEHOLDER_AVATAR };
  return {
    key: slug,
    name: user.username,
    href: `/users/${slug}`,
    avatar: user.images?.avatar?.full ?? PLACEHOLDER_AVATAR,
  };
}

const ratingOf = (row: SocialRow) => row.watched?.rating?.rating;

/**
 * OG's "People You Follow" tabs: Watching Now,
 * People Watched (most plays first), and Rated by with the followed members' average. Tabs without anyone are left
 * out, and no tabs at all means no section. `cut:` In Library, since `/social` has no collections.
 */
export function toActivity({ watching, social }: ToActivityParams): readonly ActivityTab[] {
  const watchers = (social ?? [])
    .filter((row) => row.watched)
    .toSorted((a, b) => (b.watched?.plays ?? 0) - (a.watched?.plays ?? 0));
  const raters = watchers
    .filter((row) => ratingOf(row) !== undefined)
    .toSorted((a, b) => (ratingOf(b) ?? 0) - (ratingOf(a) ?? 0));
  const withRating = (row: SocialRow, index: number) => ({ ...toUser(row.user, index), rating: ratingOf(row) });

  const average = raters.reduce((sum, row) => sum + (ratingOf(row) ?? 0), 0) / (raters.length || 1);
  const tabs: readonly (ActivityTab | null)[] = [
    watching.length > 0
      ? { id: 'watching', number: count(watching.length), text: ['Watching', 'Now'], users: watching.map(toUser) }
      : null,
    watchers.length > 0
      ? {
        id: 'watched',
        number: count(watchers.length),
        text: [people(watchers.length), 'Watched'],
        users: watchers.map((row, index) => ({ ...withRating(row, index), plays: row.watched?.plays })),
      }
      : null,
    raters.length > 0
      ? {
        id: 'rated',
        // API's percentage truncates: 7.99 is 79%.
        number: String(Math.trunc(average * 10)),
        text: ['Rated by', `${count(raters.length)} ${people(raters.length)}`],
        heart: Math.min(Math.max(Math.trunc(average), 1), 10),
        users: raters.map(withRating),
      }
      : null,
  ];
  return tabs.filter((tab) => tab !== null);
}

export interface ProfileTab {
  readonly label: string;
  readonly href: string;
  readonly current: boolean;
}

/**
 * OG's section tabs under the profile cover. Charts was commented out in OG, and Year in
 * Review, Month in Review and All Time Stats are deferred, so they're left out.
 */
const TABS = [
  { label: 'Profile', segment: '', also: [] },
  { label: 'History', segment: 'history', also: [] },
  { label: 'Progress', segment: 'progress', also: [] },
  { label: 'Library', segment: 'library', also: [] },
  { label: 'Ratings', segment: 'ratings', also: [] },
  { label: 'Lists', segment: 'lists', also: ['watchlist', 'favorites', 'recommendations'] },
  { label: 'Comments', segment: 'comments', also: [] },
  { label: 'Notes', segment: 'notes', also: [] },
  { label: 'Network', segment: 'network', also: [] },
] as const;

/** The tabs for `slug`, with the one `pathname` is on marked current. OG matched on the third path segment. */
export function profileTabs({ slug, pathname }: { slug: string; pathname: string }): readonly ProfileTab[] {
  const section = pathname.split('/').at(3) ?? '';

  return TABS.map(({ label, segment, also }) => ({
    label,
    href: segment ? `/users/${slug}/${segment}` : `/users/${slug}`,
    current: section === segment || (also as readonly string[]).includes(section),
  }));
}

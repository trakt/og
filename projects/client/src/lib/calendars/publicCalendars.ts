/**
 * OG's seven "All" calendars, in sidebar order. The copy is the calendar description
 * "5 episodes airing between...".
 */
export const PUBLIC_CALENDARS = [
  { slug: 'shows', label: 'Shows', itemType: 'episodes', past: 'aired', present: 'airing' },
  { slug: 'premieres', label: 'Premieres', itemType: 'episodes', past: 'premiered', present: 'premiering' },
  { slug: 'new-shows', label: 'New Shows', itemType: 'new shows', past: 'premiered', present: 'premiering' },
  { slug: 'finales', label: 'Finales', itemType: 'finales', past: 'aired', present: 'airing' },
  { slug: 'movies', label: 'Movies', itemType: 'movies', past: 'premiered', present: 'premiering' },
  {
    slug: 'streaming',
    label: 'Streaming',
    itemType: 'movies',
    past: 'started streaming',
    present: 'started streaming',
  },
  {
    slug: 'dvd',
    label: 'DVD & Blu-ray',
    itemType: 'movies',
    past: 'released on DVD & Blu-ray',
    present: 'releasing on DVD & Blu-ray',
  },
] as const;

export type PublicCalendar = (typeof PUBLIC_CALENDARS)[number];

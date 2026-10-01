/**
 * OG's eight "My" calendars, in sidebar order. The copy is each `my_*` action's
 * `set_under_title` call; only Shows & Movies differs from its All twin.
 */
export const MY_CALENDARS = [
  { slug: 'shows-movies', label: 'Shows & Movies', itemType: 'items', past: 'aired', present: 'airing' },
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

export type MyCalendar = (typeof MY_CALENDARS)[number];

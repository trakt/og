/**
 * OG's Up Next sorts, in the settings form's
 * order. `title` is the help line's name; `label` is the form's, which calls Activity Date "Watched Date"
 * *
 * `worker` is the `/sync/progress/up_next` sort that gives the same order, where there is one
 * OG's directions are "natural": its `asc` runs most recent
 * activity, most completed and newest premiere first, so `invert` flips the
 * direction for the worker. The rest are sorted by og (`sortUpNext`).
 */
export const upNextSorts = [
  { by: 'added', title: 'Activity Date', label: 'Watched Date', worker: { by: 'default', invert: true } },
  { by: 'completed', title: 'Completion %', label: 'Completion %' },
  { by: 'episodes', title: 'Episodes Left', label: 'Episodes Left', worker: { by: 'remaining', invert: false } },
  { by: 'time', title: 'Time Left', label: 'Time Left' },
  { by: 'plays', title: 'Plays', label: 'Plays' },
  { by: 'released', title: 'Release Date', label: 'Release Date' },
  { by: 'premiered', title: 'Premiere Date', label: 'Premiere Date', worker: { by: 'released', invert: true } },
  { by: 'title', title: 'Title', label: 'Title', worker: { by: 'title', invert: false } },
  { by: 'popularity', title: 'Popularity', label: 'Popularity' },
  { by: 'runtime', title: 'Episode Runtime', label: 'Episode Runtime' },
  { by: 'total-runtime', title: 'Total Runtime', label: 'Total Runtime', worker: { by: 'runtime', invert: true } },
  { by: 'random', title: 'Random', label: 'Random' },
] as const satisfies readonly {
  by: string;
  title: string;
  label: string;
  worker?: { by: string; invert: boolean };
}[];

export type UpNextSortBy = (typeof upNextSorts)[number]['by'];

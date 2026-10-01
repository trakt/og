/**
 * OG's progress tabs, in the dropdown's order. `library` reads the worker's
 * `collection` progress and the `collected` settings. Dropped is Watched narrowed to the shows you dropped, so it
 * reads and renders as its `kind`, `watched`, and it's your own profile only.
 */
export const progressTypes = {
  watched: { label: 'Watched', api: 'watched', settings: 'watched', kind: 'watched', ownOnly: false },
  dropped: { label: 'Dropped', api: 'watched', settings: 'watched', kind: 'watched', ownOnly: true },
  library: { label: 'Library', api: 'collection', settings: 'collected', kind: 'library', ownOnly: false },
} as const;

export type ProgressType = keyof typeof progressTypes;

export const isProgressType = (value: string): value is ProgressType => Object.hasOwn(progressTypes, value);

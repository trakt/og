/**
 * OG's progress tabs, in the dropdown's order. `library` reads the `collected` settings. Dropped is Watched narrowed to
 * the shows you dropped, so it computes and renders as its `kind`, `watched`.
 */
export const progressTypes = {
  watched: { label: 'Watched', settings: 'watched', kind: 'watched' },
  dropped: { label: 'Dropped', settings: 'watched', kind: 'watched' },
  library: { label: 'Library', settings: 'collected', kind: 'library' },
} as const;

export type ProgressType = keyof typeof progressTypes;

export const isProgressType = (value: string): value is ProgressType => Object.hasOwn(progressTypes, value);

import { summerShowcase } from './summerShowcase.ts';

type DiscoverSection = {
  readonly id: string;
  readonly label: string;
  /** OG hid the Summer TV Shows showcase and its link below 768px (`.hidden-xs`). */
  readonly hideOnPhone?: boolean;
};

/**
 * The sections of `/discover` in page order, as the sidebar nav lists them. Each is a
 * `<section>` with this id, and the nav links them.
 */
export const discoverSections: readonly DiscoverSection[] = [
  { id: 'trends', label: 'Trends' },
  { id: 'lists', label: 'Featured Lists' },
  { id: 'featured-shows', label: summerShowcase.title, hideOnPhone: true },
  { id: 'comments', label: 'Comments' },
];

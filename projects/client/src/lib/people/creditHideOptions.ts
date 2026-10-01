import { fadeHideOptions } from '../components/filters/fadeHide.ts';

export const creditHideOptions = [
  ...fadeHideOptions,
  { id: 'released', label: 'Released' },
  { id: 'unreleased', label: 'Not Released' },
  { id: 'noreleasedate', label: 'No Release Date' },
  { id: 'self', label: 'Self' },
] as const;

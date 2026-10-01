import type { FormatDateOptions } from '../utils/formatDate.ts';

/** Spread into formatDate options; calendars and date pickers also use weekStartDay (Sunday = 0). */
export type DatePreferences = Readonly<Required<Pick<FormatDateOptions, 'order' | 'hour24' | 'timeZone'>>> & {
  readonly weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

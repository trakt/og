import type { ScheduleItem } from './ScheduleItem.ts';

/** One day column of the Upcoming Schedule: "Today Sep 30" and what airs on it. */
export type ScheduleDay = {
  /** `YYYY-MM-DD` in the viewer's zone. */
  readonly date: string;
  /** "Today", "Tomorrow", "Yesterday" or the weekday, in bold. */
  readonly relative: string;
  /** "Sep 30", in the viewer's date order. */
  readonly short: string;
  readonly items: readonly ScheduleItem[];
};

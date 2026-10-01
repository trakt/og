import { PUBLIC_CALENDARS, type PublicCalendar } from '../lib/calendars/publicCalendars.ts';

export function match(param: string): param is PublicCalendar['slug'] {
  return PUBLIC_CALENDARS.some(({ slug }) => slug === param);
}

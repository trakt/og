import { MY_CALENDARS, type MyCalendar } from '../lib/calendars/myCalendars.ts';

export function match(param: string): param is MyCalendar['slug'] {
  return MY_CALENDARS.some(({ slug }) => slug === param);
}

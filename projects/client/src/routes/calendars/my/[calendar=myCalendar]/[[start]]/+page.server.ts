import { loadCalendar } from '../../../../../lib/calendars/loadCalendar.ts';

export const load = ({ fetch, parent, params, locals, cookies, url }) =>
  loadCalendar({
    fetch,
    parent,
    url,
    target: 'my',
    slug: params.calendar,
    start: params.start,
    token: locals.token,
    cookies,
    sidenavHidden: cookies.get('hide_sidenav') !== undefined,
  });

import { redirect } from '@sveltejs/kit';

/** OG's `/calendars`: My Shows & Movies signed in, All Shows signed out. */
export function GET({ locals }) {
  redirect(302, locals.token ? '/calendars/my/shows-movies' : '/calendars/shows');
}

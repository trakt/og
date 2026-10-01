import { redirect } from '@sveltejs/kit';

/** `/movies` is the trending chart, like OG. */
export const GET = () => redirect(302, '/movies/trending');

import { redirect } from '@sveltejs/kit';

/** `/shows` is the trending chart, like OG. */
export const GET = () => redirect(302, '/shows/trending');

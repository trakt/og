/** Hideable API media. Calendar episodes pass their parent show instead. */
export type VisibilityTarget = {
  type: 'movie' | 'show' | 'season';
  id: number;
  title: string;
  /**
   * A season the page only knows by its show and number (progress rows carry no season ids). API hides it through
   * the show (`shows: [{ ids, seasons: [{ number }] }]`), and `id` is the show's.
   */
  season?: { readonly show: number; readonly number: number };
};

/**
 * OG's `/users/:id/comments/:comment_type/:type/:sort_by` segment. The worker only sorts newest first, so Added Date is
 * the one sort og serves; the profile's "All Comments" link spells it out.
 */
export function match(value: string): value is 'added' {
  return value === 'added';
}

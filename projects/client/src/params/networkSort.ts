/** OG's network sort menu has one option, Added Date (`/users/:id/network/:type/added`). */
export function match(value: string): value is 'added' {
  return value === 'added';
}

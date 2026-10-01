type ListTarget = {
  readonly type: string;
  readonly ids: { readonly slug: string };
  readonly user: { readonly username: string; readonly ids: { readonly slug?: string | null } };
};

/** Where a list lives on og, by its type. */
export function listPath(list: ListTarget): string {
  const owner = `/users/${list.user.ids.slug ?? list.user.username}`;
  if (list.type === 'official') return `/lists/official/${list.ids.slug}`;
  if (list.type === 'watchlist') return `${owner}/watchlist`;
  if (list.type === 'favorites') return `${owner}/favorites`;
  return `${owner}/lists/${list.ids.slug}`;
}

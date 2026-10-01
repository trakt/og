import { favoriteRowsSchema } from './favoriteRowsSchema.ts';

/** Read every page: the notes PUT needs the list-item id, not the media id. */
export async function loadFavoriteRows(request: (path: string) => Promise<Response>) {
  const read = async (page: number) => {
    const response = await request(`/sync/favorites?limit=250&page=${page}`);
    if (!response.ok) throw new Error(String(response.status));
    return {
      rows: favoriteRowsSchema.parse(await response.json()),
      pages: Number(response.headers.get('X-Pagination-Page-Count') ?? 1),
    };
  };
  const first = await read(1);
  const rest = await Promise.all(Array.from({ length: first.pages - 1 }, (_, i) => read(i + 2)));
  return [first, ...rest].flatMap(({ rows }) => rows);
}

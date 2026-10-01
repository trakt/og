/** `paginated` when the API sent `X-Pagination-Page-Count`, `infinite` when it didn't. */
export type PageMeta =
  | { readonly type: 'paginated'; readonly current: number; readonly total: number }
  | { readonly type: 'infinite'; readonly current: number };

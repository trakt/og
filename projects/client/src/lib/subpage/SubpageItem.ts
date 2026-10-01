/** Which item a subpage is under, straight from the route params. */
export type SubpageItem =
  | { readonly type: 'movie'; readonly id: string }
  | { readonly type: 'show'; readonly id: string }
  | { readonly type: 'season'; readonly id: string; readonly season: string }
  | { readonly type: 'episode'; readonly id: string; readonly season: string; readonly episode: string };

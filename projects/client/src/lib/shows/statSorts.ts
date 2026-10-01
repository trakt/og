/** OG uses Collected in the menu; the API calls the count collectors. */
export const statSorts = [
  { by: 'watchers', name: 'Watchers', desc: true, field: 'watchers' },
  { by: 'plays', name: 'Plays', desc: true, field: 'plays' },
  { by: 'collected', name: 'Collected', desc: true, field: 'collectors' },
  { by: 'lists', name: 'Lists', desc: true, field: 'lists' },
] as const;

/** API's thousands separators plus singular and plural labels: "1 watcher", "1,234 watchers". */
export const countLabel = (n: number, word: string) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

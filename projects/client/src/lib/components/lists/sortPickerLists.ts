import type { PickerList } from './PickerList.ts';

/** OG keeps selected rows on top, then rank or title without its leading article. Search is literal text. */
export function sortPickerLists(lists: readonly PickerList[], terms = ''): PickerList[] {
  const title = (name: string) => name.replace(/^(the |an |a )/i, '').toLocaleLowerCase('en-US');
  return lists.filter(({ name }) => name.toLocaleLowerCase('en-US').includes(terms.toLocaleLowerCase('en-US')))
    .toSorted((a, b) =>
      Number(b.selected) - Number(a.selected) ||
      (a.rank && b.rank ? a.rank - b.rank : title(a.name).localeCompare(title(b.name), 'en-US'))
    );
}

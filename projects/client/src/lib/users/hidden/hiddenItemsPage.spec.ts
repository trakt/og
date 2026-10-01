import { describe, expect, it } from 'vitest';
import { hiddenItemsPage } from './hiddenItemsPage.ts';
const items = Array.from(
  { length: 125 },
  (_, index) => ({
    key: `show:${index}`,
    id: index,
    type: 'show' as const,
    title: `Show ${index}`,
    parentTitle: undefined,
    sortTitle: `show ${index}`,
    image: undefined,
    hiddenAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    date: '',
  }),
);
const options = { items, sort: 'title' as const, flipped: false, terms: '', current: 1 };
describe('hiddenItemsPage', () => {
  it('should sort the complete section before taking a 120-item page', () => {
    expect(hiddenItemsPage({ ...options, current: 2 })).toMatchObject({
      count: 125,
      meta: { current: 2, total: 2 },
      items: items.slice(120),
    });
  });
  it('should find titles on later pages and clamp the resulting page', () => {
    expect(hiddenItemsPage({ ...options, terms: 'SHOW 124', current: 20 })).toMatchObject({
      count: 1,
      meta: { current: 1, total: 1 },
      items: [items.at(124)],
    });
  });
  it('should default date sorting to newest and reverse either sort', () => {
    expect(hiddenItemsPage({ ...options, sort: 'date' }).items.at(0)?.id).toBe(124);
    expect(hiddenItemsPage({ ...options, sort: 'date', flipped: true }).items.at(0)?.id).toBe(0);
    expect(hiddenItemsPage({ ...options, flipped: true }).items.at(0)?.id).toBe(124);
  });
});

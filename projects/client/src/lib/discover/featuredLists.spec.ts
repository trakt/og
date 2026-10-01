import { describe, expect, it } from 'vitest';
import { featuredLists } from './featuredLists.ts';

describe('featuredLists', () => {
  it("should keep OG's sixteen tiles in order", () => {
    expect(featuredLists.map(({ id }) => id)).toEqual([
      30_484_958,
      30_156_306,
      27_074_303,
      2_748_259,
      2_142_753,
      6_544_049,
      2_143_363,
      832_943,
      2_233_867,
      967_660,
      1_248_149,
      1_257_909,
      1_463_475,
      1_553_339,
      1_402_475,
      1_406_012,
    ]);
  });

  it('should find the art for every tile', () => {
    for (const list of featuredLists) {
      expect(list.background, list.title.join(' ')).toMatch(/bg\.jpg$/);
      expect(list.logo, list.title.join(' ')).toMatch(/logo\.png$/);
    }
  });

  it('should label only the two IMDB tiles', () => {
    expect(featuredLists.filter((list) => list.label).map(({ title, label }) => [title[1], label])).toEqual([
      ['Top 250 Movies', 'Updated Daily'],
      ['Top 250 TV Shows', 'Updated Daily'],
    ]);
  });
});

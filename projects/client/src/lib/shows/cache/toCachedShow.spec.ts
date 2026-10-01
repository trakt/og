import { describe, expect, it } from 'vitest';
import { cachedShowSchema } from './cachedShowSchema.ts';
import { toCachedShow } from './toCachedShow.ts';

const body = {
  ids: { trakt: 1388, slug: 'breaking-bad' },
  title: 'Breaking Bad',
  year: 2008,
  status: 'ended',
  genres: ['drama'],
  runtime: 47,
  total_runtime: 2914,
  votes: 120_000,
  aired_episodes: 62,
  first_aired: '2008-01-21T02:00:00.000Z',
  last_aired: '2013-09-30T01:00:00.000Z',
};

describe('toCachedShow', () => {
  it('should keep the summary fields and mark a read without images incomplete', () => {
    const show = toCachedShow(cachedShowSchema.parse(body), 10);

    expect(show).toMatchObject({
      id: 1388,
      slug: 'breaking-bad',
      airedEpisodes: 62,
      totalRuntime: 2914,
      lastAired: '2013-09-30T01:00:00.000Z',
      fetchedAt: 10,
      complete: false,
    });
    expect(show.poster).toBeUndefined();
  });

  it('should take the first poster and fanart from a read with images', () => {
    const show = toCachedShow(
      cachedShowSchema.parse({ ...body, images: { poster: ['a.jpg', 'b.jpg'], fanart: ['f.jpg'] } }),
      10,
    );

    expect(show).toMatchObject({ poster: 'a.jpg', fanart: 'f.jpg', complete: true });
  });
});

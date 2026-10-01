import { describe, expect, it } from 'vitest';
import { calendarFeedUrls } from './calendarFeedUrls.ts';

describe('calendarFeedUrls', () => {
  it('should map every My navigation slug to its native subscription route', () => {
    const urls = calendarFeedUrls({ user: { vip: true }, account: { token: 'feed-token' } });
    expect(Object.values(urls).map((url) => new URL(url ?? '').pathname)).toEqual([
      '/calendars/my/media.ics',
      '/calendars/my/shows.ics',
      '/calendars/my/shows/premieres.ics',
      '/calendars/my/shows/new.ics',
      '/calendars/my/shows/finales.ics',
      '/calendars/my/movies.ics',
      '/calendars/my/streaming.ics',
      '/calendars/my/dvd.ics',
    ]);
    expect(Object.values(urls).every((url) => url?.startsWith('https://apiz.trakt.tv/'))).toBe(true);
    expect(new URL(urls.shows ?? '').searchParams.get('slurm')).toBe('feed-token');
  });

  it('should encode the feed token without making it another query parameter', () => {
    const urls = calendarFeedUrls({ user: { vip: true }, account: { token: 'a+b&?#=' } });
    expect(new URL(urls.shows ?? '').searchParams.get('slurm')).toBe('a+b&?#=');
    expect([...new URL(urls.shows ?? '').searchParams.keys()]).toEqual(['slurm']);
  });

  it('should withhold URLs for non-VIPs and missing or malformed settings', () => {
    const settings = [
      null,
      {},
      { user: { vip: false }, account: { token: 'feed-token' } },
      { user: { vip: true }, account: {} },
      { user: { vip: true }, account: { token: null } },
      { user: { vip: true }, account: { token: '  ' } },
      { user: { vip: 'true' }, account: { token: 'feed-token' } },
      { user: { vip: true }, account: { token: 123 } },
    ];
    expect(settings.every((value) => Object.values(calendarFeedUrls(value)).every((url) => url === null))).toBe(true);
  });
});

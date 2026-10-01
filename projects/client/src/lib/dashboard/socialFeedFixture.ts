import type { SocialActivity } from './socialActivitySchema.ts';

const member = (slug: string, name: string | null) => ({ username: slug, name, ids: { slug }, images: null });

const show = (id: number, slug: string, title: string, year: number, genres = ['drama']) => ({
  ids: { trakt: id, slug },
  title,
  year,
  genres,
});

const episode = (id: number, season: number, number: number, title: string | null, abs?: number) => ({
  ids: { trakt: id },
  season,
  number,
  number_abs: abs,
  title,
});

const at = (hoursAgo: number, now: Date) => new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();

/**
 * Public titles watched by made-up members, for the design demo and the specs. No artwork or avatars, like local OG.
 * The member names are long enough to show the three-line clamp.
 */
function rows(now: Date): readonly SocialActivity[] {
  const watch = (id: number, hoursAgo: number, user: ReturnType<typeof member>) => ({
    id,
    activity_at: at(hoursAgo, now),
    action: 'watch' as const,
    user,
  });
  const ada = member('sample-ada', 'Ada Sample');
  const bo = member('sample-bo', null);
  const cy = member('sample-cyrus-with-a-long-name', 'Cyrus Longname-Samplesworth');

  return [
    {
      ...watch(7001, 1, ada),
      type: 'episode',
      episode: episode(5001, 5, 14, 'Ozymandias'),
      show: show(1388, 'breaking-bad', 'Breaking Bad', 2008),
    },
    {
      ...watch(7002, 3, bo),
      type: 'movie',
      movie: { ids: { trakt: 120, slug: 'the-dark-knight-2008' }, title: 'The Dark Knight', year: 2008 },
    },
    {
      ...watch(7003, 5, cy),
      type: 'episode',
      episode: episode(5002, 1, 10, 'Braindead'),
      show: show(60300, 'the-bear', 'The Bear', 2022),
    },
    {
      ...watch(7004, 20, ada),
      type: 'episode',
      episode: episode(5003, 21, 5, 'The Mysterious Wizard of Wano', 897),
      show: show(37696, 'one-piece', 'One Piece', 1999, ['anime', 'action']),
    },
    {
      ...watch(7005, 30, bo),
      type: 'movie',
      movie: { ids: { trakt: 1, slug: 'inception-2010' }, title: 'Inception', year: 2010 },
    },
    {
      ...watch(7006, 50, cy),
      type: 'episode',
      episode: episode(5004, 1, 1, null),
      show: show(1390, 'game-of-thrones', 'Game of Thrones', 2011),
    },
    {
      ...watch(7007, 70, ada),
      type: 'movie',
      movie: { ids: { trakt: 16, slug: 'heat-1995' }, title: 'Heat', year: 1995 },
    },
  ];
}

/** Seven sample plays: one full row of six and one more. */
export const socialFeedFixture = { rows };

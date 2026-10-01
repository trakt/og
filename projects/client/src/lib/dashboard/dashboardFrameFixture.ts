import { toProfileUser } from '../users/toProfileUser.ts';

/** Fake local-OG values for the reusable frame component demo. */
export const dashboardFrameFixture = {
  user: toProfileUser({
    username: 'og_tester',
    name: 'OG Tester',
    private: false,
    vip: true,
    vip_years: 7,
    ids: { slug: 'og_tester' },
  }),
  stats: {
    episodes: { minutes: 3000, watched: 50, plays: 50, collected: 0, ratings: 0, comments: 0 },
    shows: { watched: 5, collected: 2, ratings: 0, comments: 0 },
    movies: { minutes: 1971, watched: 7, plays: 13, collected: 6, ratings: 0, comments: 0 },
  },
  collected: { episodes: 10, shows: 2, movies: 6 },
  requests: [{
    id: 1,
    slug: 'toby-gerlach',
    name: 'Toby Gerlach',
    avatarUrl: 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png',
    requestedAt: 'Sep 29, 2026 3:00 PM',
  }],
};

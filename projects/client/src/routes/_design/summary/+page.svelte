<!-- The summary pages' lazy sections with made-up data: People You Follow, the comments and lists previews, related. -->
<script lang="ts">
import { page } from '$app/state';
import MediaTools from '$lib/components/summary/MediaTools.svelte';
import ReportDialog from '$lib/components/summary/ReportDialog.svelte';
import SummaryPoster from '$lib/components/summary/SummaryPoster.svelte';
import Container from '$lib/components/container/Container.svelte';
import ActivityTabs from '$lib/components/summary/ActivityTabs.svelte';
import CommentsPreview from '$lib/components/summary/CommentsPreview.svelte';
import ListsPreview from '$lib/components/summary/ListsPreview.svelte';
import RelatedItems from '$lib/components/summary/RelatedItems.svelte';
import type { CommentTab, ListTab } from '$lib/summary/sectionsClient';
import type { ActivityTab, ActivityUser } from '$lib/summary/toActivity';
import type { RelatedCard } from '$lib/summary/toRelatedCard';
import { formatting, movie, review, spoiler } from '../comments/fixtures.ts';

let reporting = $state(false);
const reportTarget = {
  type: 'movie' as const,
  id: 1,
  title: 'Fight Club (1999)',
  href: '/movies/fight-club-1999',
  tmdb: 'https://www.themoviedb.org/movie/550',
};

const AVATAR = 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png';
const member = (i: number, extra: Partial<ActivityUser> = {}): ActivityUser => ({
  key: `member-${i}`,
  name: `member_${i}`,
  href: '/users/og_tester',
  avatar: AVATAR,
  ...extra,
});

const activity: readonly ActivityTab[] = [
  {
    id: 'watching',
    number: '2',
    text: ['Watching', 'Now'],
    users: [member(1), { key: 'private-1', name: 'hidden', avatar: AVATAR }],
  },
  {
    id: 'watched',
    number: '16',
    text: ['People', 'Watched'],
    users: Array.from(
      { length: 16 },
      (_, i) => member(i, { plays: 16 - i, rating: i % 3 === 0 ? 10 - i / 3 : undefined }),
    ),
  },
  {
    id: 'rated',
    number: '83',
    text: ['Rated by', '6 People'],
    heart: 8,
    users: Array.from({ length: 6 }, (_, i) => member(i * 3, { rating: 10 - i })),
  },
];

const comments: readonly CommentTab[] = [
  { id: 'likes', label: 'Likes', count: 'All Time', comments: [review, formatting] },
  { id: 'recent', label: 'Recent', comments: [spoiler] },
];

const list = (id: number, name: string, extra: Partial<ListTab['lists'][number]> = {}) => ({
  id,
  kind: 'personal' as const,
  href: `/users/og_tester/lists/${id}`,
  name,
  owner: { slug: 'og_tester', name: 'OG Tester', href: '/users/og_tester', avatar: AVATAR },
  posters: [{}, {}, {}, {}, {}],
  itemCount: 24,
  likeCount: 12,
  commentCount: 2,
  pills: [],
  description: 'Crews, vaults and one last job.',
  ...extra,
});
const lists: readonly ListTab[] = [
  {
    id: 'popular',
    label: 'Popular',
    lists: [
      list(1, 'Heat Collection', {
        kind: 'official',
        href: '/lists/official/heat-collection',
        pills: ['Official List'],
        commentCount: undefined,
      }),
      list(2, 'Heist Night'),
    ],
  },
  { id: 'me', label: 'Me', lists: [list(3, 'Rewatch Soon', { pills: ['Private'], likeCount: 0 })] },
];

const related: readonly RelatedCard[] = Array.from({ length: 6 }, (_, i) => ({
  type: 'movie',
  id: 900 + i,
  href: '/movies/heat-1995',
  title: `Related Movie ${i + 1}`,
  year: 1990 + i,
  released: true,
  rating: 8 - i / 2,
}));
</script>

<section>
  <Container>
    <div class="list-cover-demo">
      <SummaryPoster alt="List poster collage" posters={[{}, {}, {}, {}]} />
    </div>
    <div class="tools-demo">
      <MediaTools target={reportTarget} updatedAt="2026-09-29T12:00:00Z" datasource="TMDB" />
    </div>
    <button type="button" onclick={() => { reporting = true; }}>Report Movie</button>
    <ReportDialog bind:open={reporting} target={reportTarget} />
    <h1>Summary sections</h1>
    <p>
    What loads under a movie or show summary as it scrolls into view. Local OG: the bottom of
    <code>/movies/fight-club-1999</code>.
  </p>
    <ActivityTabs tabs={activity} />
    <CommentsPreview
      tabs={comments}
      item={movie}
      viewer={page.data.user ? { slug: page.data.user.slug } : null}
      count={128}
      href="/movies/heat-1995"
      dateOptions={page.data.datePreferences}
    />
    <ListsPreview tabs={lists} count={342} href="/movies/heat-1995" />
  </Container>
</section>
<RelatedItems title="Heat" load={() => Promise.resolve(related)} datePreferences={page.data.datePreferences} />

<style>
.tools-demo {
  inline-size: calc(var(--summary-offset) - var(--gutter));
  margin-block: var(--gutter);
}

.list-cover-demo {
  inline-size: calc(var(--summary-offset) - var(--gutter));
  margin-block: var(--gutter);
}
</style>

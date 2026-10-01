<script lang="ts">
import OfficialListHeader from '$lib/components/lists/OfficialListHeader.svelte';
import WatchNowChips from '$lib/components/watchnow/WatchNowChips.svelte';
import Container from '$lib/components/container/Container.svelte';
import ListTransfer from '$lib/components/lists/ListTransfer.svelte';
import clone from '$lib/icons/thin/clone.svg?raw';
import fileExport from '$lib/icons/thin/file-export.svg?raw';
import { toBuiltInListView } from '$lib/lists/toBuiltInListView';
import MediaList from '$lib/components/lists/MediaList.svelte';
import BuiltInListDialog from '$lib/components/lists/BuiltInListDialog.svelte';
import NewListDialog from '$lib/components/lists/NewListDialog.svelte';
import ListItemEdit from '$lib/components/lists/ListItemEdit.svelte';
import ListReorderControls from '$lib/components/lists/ListReorderControls.svelte';
import RankInput from '$lib/components/lists/RankInput.svelte';
import ListRow from '$lib/components/media/ListRow.svelte';
import ReadNotes from '$lib/components/lists/ReadNotes.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import ListManageBar from '$lib/lists/ListManageBar.svelte';
import ListStats from '$lib/lists/ListStats.svelte';
import type { ListStatsItem } from '$lib/lists/toListStats';
import type { OverlayState } from '$lib/overlay/createOverlay.svelte';
let open = $state(false);
let builtInOpen = $state(false);
let rank = $state(2);
let posterRank = $state(3);
const transferSource = toBuiltInListView({
  kind: 'watchlist',
  profile: { slug: 'og_tester', isPrivate: false },
  id: 13,
  itemCount: 12,
  commentCount: 0,
  sort: { by: 'rank', how: 'asc' },
});
const clamp = (next: number) => Math.max(1, Math.min(12, next));

// A signed-in viewer's stats bar, against a made-up library: 2 of 10 watched, 5 collected, then all of a 3-item list.
const items: ListStatsItem[] = Array.from({ length: 10 }, (_, i) => ({ type: 'movie', id: i + 1 }));
const library = (_: string, id: number): OverlayState => ({ watched: id <= 2, collected: id <= 5 });
const everything = (): OverlayState => ({ watched: true, collected: true });
const never = new Promise<null>(() => {});
let mode = $state<'add' | 'edit' | 'watchlist' | 'favorites'>('add');
const initial = {
  name: 'Sci-Fi Club',
  description: 'Picks for the monthly club.',
  privacy: 'friends',
  allow_comments: true,
  display_numbers: true,
  sort_by: 'rank',
  sort_how: 'asc',
  collaborators: ['teodoro_2'],
};
const following = [{ slug: 'teodoro_2', name: 'Elsy Murphy (@teodoro_2)' }];
</script>
<svelte:head>
  <title>List picker design system - Trakt</title>
</svelte:head>
<OfficialListHeader />
<section class="demo">
  <Container><h1>List picker</h1><p>Local OG references: <a href="https://og-shots.trakt.tv/135/2d64380a-rails-add.png">Add list</a>, <a href="https://og-shots.trakt.tv/135/68548be2-rails-edit.png">Edit list</a> and <a href="https://og-shots.trakt.tv/135/5e5d9cba-rails-delete.png">Delete confirmation</a>.</p><div class="sample"><MediaList target={{ type: 'movie', id: 1, title: 'Fight Club' }} variant="summary" /></div>{#each ['add', 'edit', 'watchlist', 'favorites'] as value (value)}<button onclick={() => { mode = value as typeof mode; open = true; }}>Preview {value}</button>{/each}</Container>
</section>
<section class="demo">
  <Container>
    <h2>List poster: Read Notes and the rating line</h2>
    <PosterGrid>
      <PosterCard href="/movies/heat-1995" title="Heat" rank={3}
        subtitles={[{ rating: 8.19, votes: 12_400, href: '/movies/heat-1995' }, '\u00a0']}>
        {#snippet posterOverlay()}<ReadNotes notes="Watch the **director's cut** :fire:" />{/snippet}
      </PosterCard>
    </PosterGrid>
  </Container>
</section>
<section class="demo">
  <Container>
    <h2>List poster in manage mode</h2>
    <PosterGrid>
      <PosterCard href="/movies/heat-1995" title="Heat" subtitles={['\u00a0']}>
        {#snippet posterOverlay()}
          <RankInput name="Heat" rank={posterRank} onmove={(next) => posterRank = clamp(next)} />
          <ListItemEdit name="Heat" rank={posterRank} total={12} notes draggable changeRank={false}
            onmove={(next) => posterRank = clamp(next)} ondrag={() => {}} onchangerank={() => {}} onremove={() => {}}
            onnotes={() => {}} />
        {/snippet}
      </PosterCard>
      <PosterCard href="/movies/alien-1979" title="Alien" subtitles={['\u00a0']}>
        {#snippet posterOverlay()}
          <RankInput name="Alien" rank={7} onmove={() => {}} />
          <ListItemEdit name="Alien" rank={7} total={12} notes={false} draggable={false} changeRank onmove={() => {}}
            ondrag={() => {}} onchangerank={() => {}} onremove={() => {}} onnotes={() => {}} />
        {/snippet}
      </PosterCard>
    </PosterGrid>
  </Container>
  <ListManageBar count={12} busy={false} onreset={() => {}} ondelete={() => {}}>
    {#snippet transfers()}
      <ListTransfer source={{ ...transferSource, kind: 'personal', name: 'All-Time Favorites' }} query={{ types: [], genres: [], page: 1, limit: 120 }} sort={{ by: 'rank', how: 'asc' }} count={12} svg={clone} managing />
      <ListTransfer source={{ ...transferSource, kind: 'personal', name: 'All-Time Favorites' }} query={{ types: [], genres: [], page: 1, limit: 120 }} sort={{ by: 'rank', how: 'asc' }} count={12} svg={fileExport} managing move />
    {/snippet}
  </ListManageBar>
</section>
<section class="demo">
  <Container>
    <h2>Lists index reorder controls</h2>
    <ListRow href="/users/og_tester/lists/all-time-favorites" name="All-Time Favorites"
      owner={{ name: 'OG Tester', href: '/users/og_tester' }} posters={[{}, {}, {}, {}, {}]} itemCount={12}
      likeCount={3} likeTarget={{ id: 23, ownerSlug: 'og_tester', viewer: 'og_tester' }}>
      {#snippet reorderControls()}<ListReorderControls name="All-Time Favorites" {rank} total={5} onmove={(next) => rank = Math.max(1, Math.min(5, next))} ondrag={() => {}} />{/snippet}
    </ListRow>
  </Container>
</section>
<section class="demo">
  <Container><h2>List stats bar</h2></Container>
  {#snippet none()}{/snippet}
  <SectionToolbar filters={none}>
    {#snippet summary()}
      <ListStats itemCount={10} stats={{ count: 10, runtime: 3844, items }} progress stateOf={library} likeCount={0}
        comments={{ count: 0, href: '/users/og_tester/lists/heist-night/comments' }} />
    {/snippet}
  </SectionToolbar>
  <SectionToolbar filters={none}>
    {#snippet summary()}
      <ListStats itemCount={3} stats={{ count: 3, runtime: 481, items: items.slice(0, 3) }} progress
        stateOf={everything} likeCount={1_204} comments={{ count: 12, href: '/users/og_tester/lists/heist-night/comments' }} />
    {/snippet}
  </SectionToolbar>
  <Container><p>Streaming (pending), and signed out:</p></Container>
  <SectionToolbar filters={none}>
    {#snippet summary()}
      <ListStats itemCount={1_523} stats={never} progress stateOf={library} likeCount={3} />
    {/snippet}
  </SectionToolbar>
  <SectionToolbar filters={none}>
    {#snippet summary()}
      <ListStats itemCount={57} stats={{ count: 57, runtime: 6012 }} likeCount={3} />
    {/snippet}
  </SectionToolbar>
</section>
<section class="demo">
  <Container>
    <h2>Applied streaming filters</h2>
  </Container>
  <WatchNowChips tiles={[
    { kind: 'bundle', id: 'subscriptions', name: 'Streaming Subscriptions', country: 'US' },
    { kind: 'service', id: 'netflix', source: { name: 'Netflix', color: '#e50914' } },
  ]} />
</section>
<section class="demo">
  <Container><h2>Built-in list edit</h2><button onclick={() => builtInOpen = true}>Preview watchlist edit</button></Container>
</section>
<BuiltInListDialog bind:open={builtInOpen} kind="watchlist" vip busy={false} description={undefined} sortBy="rank"
  sortHow="asc" onsave={() => builtInOpen = false} />
{#if open}<NewListDialog bind:open {following} initial={mode === 'add' ? undefined : initial} editing={mode !== 'add'}
  kind={mode === 'watchlist' || mode === 'favorites' ? mode : 'list'} onsave={() => open = false} />{/if}

<style>
.demo {
  padding-block: var(--header-height) var(--gutter);
}
.sample {
  max-inline-size: var(--list-picker-width);
  margin-block: var(--gutter);
}
</style>

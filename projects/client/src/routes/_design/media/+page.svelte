<script lang="ts">
import defaultCover from '$lib/assets/profile-cover-default.jpg';
import FrameGrid from '$lib/components/frame/FrameGrid.svelte';
import FanartCard from '$lib/components/media/FanartCard.svelte';
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import ListRow from '$lib/components/media/ListRow.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import type { OverlayState } from '$lib/overlay/createOverlay.svelte';
import { overlay } from '$lib/overlay/overlay';
import { imageUrl } from '$lib/utils/imageUrl';

const { data } = $props();
const weekendNotes = '**Saturday** first, then _Sunday_ if there is time.\n\n> One rule: no spoilers.';

const shows = $derived(
  data.trending.map(({ show, watchers }) => ({
    id: show.ids.trakt,
    href: `/shows/${show.ids.slug}`,
    title: show.title,
    year: show.year ?? undefined,
    rating: show.rating ?? undefined,
    airedEpisodes: show.aired_episodes ?? undefined,
    poster: imageUrl(show.images?.poster?.at(0), 'thumb'),
    fanart: imageUrl(show.images?.fanart?.at(0), 'thumb'),
    fanartFull: imageUrl(show.images?.fanart?.at(0), 'full'),
    watchers,
  })),
);

// One card per overlay slot, so every state shows without signing in.
const samples: { label: string; state: OverlayState; userRating?: number; rank?: number }[] = [
  { label: 'Idle', state: {}, rank: 1 },
  { label: 'Watched', state: { watched: true, watchedEpisodes: 99 }, rank: 2 },
  { label: 'Half watched', state: { watched: true, watchedEpisodes: 1, collected: true, collectedEpisodes: 1 } },
  { label: 'Listed and rated', state: { watchlisted: true }, userRating: 8 },
  { label: 'Rewatching', state: { watched: true, watchedEpisodes: 99, rewatching: true }, userRating: 10 },
  {
    label: 'Everything',
    state: {
      watched: true,
      watchedEpisodes: 99,
      collected: true,
      collectedEpisodes: 99,
      listed: true,
      favorited: true,
    },
    userRating: 3,
  },
  { label: 'Dropped', state: { watched: true, watchedEpisodes: 1, dropped: true } },
  { label: 'Movie, 3 plays', state: { watched: true, plays: 3, collected: true, collectedAt: '2026-09-01T12:00:00Z' } },
];

const featured = $derived(shows.at(0));

// Fixture members for the Users search cards: OG's placeholder avatars, one on a VIP cover.
const placeholder = (name: string) => `https://media.trakt.tv/hotlink-ok/placeholders/medium/${name}.png`;
const members = $derived([
  { name: 'Director', avatar: placeholder('zoidberg'), cover: shows.at(1)?.fanart, tags: [{ text: 'Director' }] },
  { name: 'Executive Producer', avatar: placeholder('leela'), cover: undefined, tags: [{ text: 'VIP EP' }] },
  { name: 'Member', avatar: placeholder('fry'), cover: undefined, tags: [] },
]);

let theme = $state('light');
$effect(() => {
  document.documentElement.dataset.theme = theme;
  return () => delete document.documentElement.dataset.theme;
});
</script>

<svelte:head>
  <title>Media components: og</title>
</svelte:head>

<main>
  {#if featured}
    <FanartHeader image={featured.fanartFull}>
      <h1>{featured.title} <span class="year">{featured.year}</span></h1>
      {#snippet stats()}
        <p class="stats">{featured.watchers.toLocaleString('en-US')} watchers right now</p>
      {/snippet}
    </FanartHeader>
  {/if}

  <section>
    <div class="container">
      <h2>Media components</h2>
      <p>
        The fanart header above, then poster cards, fanart cards and list rows, built from trending shows. The overlay
        slots use sample state; the live grid reads the signed-in user's overlay.
      </p>
      <label>
        Theme
        <select bind:value={theme}>
          <option value="light">Light (OG default)</option>
          <option value="dark">Dark (dark knight)</option>
        </select>
      </label>

      <h3>Search poster cards: six per row</h3>
      <FrameGrid variant="poster">
        {#each shows.slice(0, 6) as show (show.id)}
          <FanartCard variant="poster" href={show.href} title={show.title} image={show.poster} hideTitle={show.poster !== undefined}
            tags={[{ text: 'Show' }, ...(show.year ? [{ text: String(show.year), kind: 'generic' as const }] : [])]}
            icons={{ fill: quickIconFill({ state: {} }), rating: show.rating }} />
        {/each}
      </FrameGrid>

      <h3>Search user cards: three per row</h3>
      <FrameGrid variant="uniform">
        {#each members as member (member.name)}
          <FanartCard href="/_design/media" title={member.name} image={member.cover ?? defaultCover} avatar={member.avatar}
            tags={member.tags} />
        {/each}
      </FrameGrid>

      <h3>Poster cards: every overlay slot</h3>
      <PosterGrid>
        {#each samples as sample, i (sample.label)}
          {@const show = shows.at(i)}
          {#if show}
            <PosterCard
              href={show.href}
              title={show.title}
              image={show.poster}
              subtitles={[sample.label]}
              rank={sample.rank}
              userRating={sample.userRating}
              dropped={sample.state.dropped}
              rewatching={sample.state.rewatching}
              icons={{
                fill: quickIconFill({
                  state: sample.state,
                  airedEpisodes: sample.state.watchedEpisodes === 1 ? 2 : 99,
                  runtime: 104,
                  datePreferences: data.datePreferences,
                }),
                rating: show.rating,
                watchNow: 'play',
              }}
            />
          {/if}
        {/each}
      </PosterGrid>

      <h3>Poster grid: live overlay</h3>
      <PosterGrid>
        {#each shows.slice(0, 12) as show (show.id)}
          {@const state = overlay.state('show', show.id)}
          <PosterCard
            href={show.href}
            title={show.title}
            image={show.poster}
            subtitles={show.year ? [String(show.year)] : []}
            userRating={state.rating}
            dropped={state.dropped}
            icons={{
              fill: quickIconFill({ state, airedEpisodes: show.airedEpisodes, datePreferences: data.datePreferences }),
              rating: show.rating,
              watchNow: 'play',
            }}
          />
        {/each}
      </PosterGrid>

      <h3>Screenshot cards, four a row</h3>
      <PosterGrid columns={4}>
        {#each shows.slice(0, 4) as show (show.id)}
          <PosterCard
            href={show.href}
            title="1x01 Pilot"
            fullTitle="{show.title}: 1x01 Pilot"
            variant="screenshot"
            image={show.fanart}
            subtitles={[show.title]}
            icons={{ fill: quickIconFill({ state: {} }), rating: show.rating, listLabel: 'Add to list' }}
          />
        {/each}
      </PosterGrid>

      <h3>Fanart cards, flush like the chart pages</h3>
      <PosterGrid columns={3} flush>
        {#each shows.slice(0, 6) as show, i (show.id)}
          <FanartCard
            href={show.href}
            title={show.title}
            year={show.year}
            image={show.fanart}
            userRating={i === 1 ? 9 : undefined}
            dropped={i === 4}
            tags={[
              { text: `${show.watchers.toLocaleString('en-US')} watchers` },
              ...(i === 2 ? [{ text: 'Series Premiere', kind: 'premiere' as const }] : []),
              ...(i === 3 ? [{ text: '12 collected', kind: 'collect' as const }] : []),
            ]}
            icons={{
              fill: quickIconFill({ state: i === 0 ? { watched: true, favorited: true } : {} }),
              rating: show.rating,
              favorite: true,
              watchNow: 'play',
            }}
          />
        {/each}
      </PosterGrid>

      <h3>List rows</h3>
      <ListRow
        href="/users/og_tester/lists/all-time-favorites"
        name="All-Time Favorites"
        owner={{ name: 'OG Tester', href: '/users/og_tester' }}
        posters={shows.slice(0, 5).map(({ title, poster }) => ({ title, image: poster }))}
        itemCount={12}
        likeCount={3}
        commentCount={1}
        rank={1}
        description="The ones I keep rewatching."
      />
      <ListRow
        href="/users/og_tester/lists/heist-night"
        name="Heist Night"
        owner={{ name: 'OG Tester', href: '/users/og_tester' }}
        posters={shows.slice(5, 8).map(({ title, poster }) => ({ title, image: poster }))}
        itemCount={3}
        likeCount={0}
        commentCount={0}
        pills={['Private']}
        description="Crews, vaults and one last job."
      />
      <p>The owner's row on their lists index: a link list with collaborators, a VIP owner and a markdown description.</p>
      <ListRow
        href="/users/og_tester/lists/watch-next-weekend"
        name="Watch Next Weekend"
        owner={{ name: 'OG Tester', href: '/users/og_tester', vip: { kind: 'vip', tag: { text: 'EP', title: 'Executive Producer' }, years: null } }}
        posters={shows.slice(2, 6).map(({ title, poster }) => ({ title, image: poster }))}
        itemCount={4}
        likeCount={2}
        commentCount={5}
        pills={['Private']}
        shareLink
        collaborators={['Kendal Hagenes', 'Sean']}
        description={weekendNotes}
        rank={2}
        actions={{ report: {}, edit: {}, delete: {}, progressHref: '/vip/list-progress', shareUrl: 'https://og.trakt.tv/users/og_tester/lists/watch-next-weekend' }}
      />
      <p>A collaborator's row: "Stop collaborating" instead of edit and delete.</p>
      <ListRow
        href="/users/kendal_hagenes_1/lists/heist-night"
        name="Heist Night"
        owner={{ name: 'Kendal Hagenes', href: '/users/kendal_hagenes_1', vip: { kind: 'director' } }}
        posters={shows.slice(6, 7).map(({ title, poster }) => ({ title, image: poster }))}
        itemCount={1}
        likeCount={0}
        pills={['Following']}
        collaborators={['OG Tester']}
        actions={{ report: {}, leave: {}, progressHref: '/vip/list-progress', shareUrl: 'https://og.trakt.tv/users/kendal_hagenes_1/lists/heist-night' }}
      />
    </div>
  </section>

  <FanartHeader image={shows.at(1)?.fanartFull} slim>
    <h2>Comments for {shows.at(1)?.title}</h2>
  </FanartHeader>
</main>

<style>
section {
  padding-block: var(--gutter) calc(var(--gutter) * 2);
}

.container {
  max-inline-size: var(--container-lg);
  margin-inline: auto;
  padding-inline: calc(var(--gutter) / 2);
}

label {
  display: inline-grid;
  gap: var(--space-sm-block);
}

.year {
  color: var(--gray-light);
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-header-year);
}

.stats {
  margin: 0;
  line-height: calc(var(--line-height-computed) * 2);
}
</style>

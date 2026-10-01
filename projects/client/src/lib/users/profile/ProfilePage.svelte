<!--
  The profile page under the frame: the stat boxes, or the welcome hero on your own empty
  profile, then favorites, the recently watched episodes and movies, the genre and ratings charts, the most watched
  shows and movies, and the newest comments.
-->
<script lang="ts">
import DashboardPanel from '$lib/components/dashboard/DashboardPanel.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import FavoriteCard from '$lib/components/users/FavoriteCard.svelte';
import MostWatched from '$lib/components/users/MostWatched.svelte';
import ProfileCharts from '$lib/components/users/ProfileCharts.svelte';
import ProfileStatBoxes from '$lib/components/users/ProfileStatBoxes.svelte';
import WelcomeHero from '$lib/components/users/WelcomeHero.svelte';
import clock from '$lib/icons/thin/clock.svg?raw';
import comments from '$lib/icons/thin/comments.svg?raw';
import star from '$lib/icons/thin/star.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import UserCommentWithPoster from '$lib/users/comments/UserCommentWithPoster.svelte';
import type { ProfileUser } from '$lib/users/ProfileUser';
import type { loadProfile } from './loadProfile.ts';
import type { WatchedCard } from './toProfileSummary.ts';

type Props = {
  data: Awaited<ReturnType<typeof loadProfile>> & {
    profile: ProfileUser;
    isSelf: boolean;
    user: { readonly slug: string } | null;
    datePreferences: DatePreferences;
  };
};

const { data }: Props = $props();
const user = $derived(`/users/${data.profile.slug}`);
const viewer = $derived(data.user ? { slug: data.user.slug } : null);
const description = $derived(
  `${data.profile.firstName} is using Trakt to automatically track TV shows and movies they are watching, collecting, and rating.`,
);

// OG's `.user-first-name.titlecase`, which its JS swapped for "You" on your own profile (users.js:127-140).
const hasnt = (rest: string) =>
  data.isSelf
    ? `You haven't ${rest}`
    : `${data.profile.firstName.charAt(0).toUpperCase()}${data.profile.firstName.slice(1)} hasn't ${rest}`;
</script>

<svelte:head>
  <title>{data.profile.displayName}'s profile - Trakt</title>
  <meta name="description" content={description} />
</svelte:head>

{#snippet watched(card: WatchedCard)}
  {@const state = overlay.state(card.type, card.id)}
  <PosterCard
  href={card.href}
  title={card.title}
  number={card.number}
  image={card.image}
  variant={card.type === 'episode' ? 'screenshot' : 'poster'}
  episodeBadge={card.episodeBadge}
  subtitles={card.show ? [card.show, card.watchedDate] : [card.watchedDate]}
  userRating={state.rating}
  icons={{
      listTarget: { type: card.type, id: card.id, title: card.title },
      fill: quickIconFill({ state, datePreferences: data.datePreferences }),
      rating: card.rating,
      watchNow: 'play',
      listLabel: card.type === 'episode' ? 'Add to list' : 'Add to watchlist',
    }}
/>
{/snippet}


{#if data.boxes}
  <ProfileStatBoxes about={data.profile.about} {...data.boxes} />
{:else if data.welcome}
  <WelcomeHero />
{/if}

<DashboardPanel
  --panel-bg="var(--color-favorites-bg)"
  --color-no-data-bg="var(--color-favorites-no-data-bg)"
  title="Favorites"
  icon={star}
  seeMore={{ href: `${user}/favorites`, text: 'All Favorites' }}
  customizeHref={data.isSelf ? '/settings#profile' : undefined}
>
  {#if data.favorites.length > 0}
    <div class="favorites">
      {#each data.favorites as favorite (`${favorite.type}-${favorite.id}`)}<FavoriteCard {favorite} />{/each}
    </div>
  {:else}
    <div class="empty"><NoData>{hasnt('added any favorite shows and movies yet.')}</NoData></div>
  {/if}
</DashboardPanel>

{#each [
  { type: 'episodes', title: 'Recently Watched Episodes', cards: data.episodes, columns: 4 },
  { type: 'movies', title: 'Recently Watched Movies', cards: data.movies, columns: 6 },
] as row (row.type)}
  <DashboardPanel title={row.title} icon={clock} seeMore={{ href: `${user}/history/${row.type}`, text: 'See More' }}>
    {#if row.cards.length > 0}
      <PosterGrid columns={row.columns}>
        {#each row.cards as card (card.key)}{@render watched(card)}{/each}
      </PosterGrid>
    {:else}
      <div class="empty"><NoData>{hasnt(`watched any ${row.type} yet.`)}</NoData></div>
    {/if}
  </DashboardPanel>
{/each}

{#if data.charts}
  <ProfileCharts genres={data.charts.genres} ratings={data.charts.ratings} slug={data.profile.slug} />
{/if}

{#if data.mostWatched}
  <MostWatched
  {...data.mostWatched}
  slug={data.profile.slug}
  isSelf={data.isSelf}
  {hasnt}
  datePreferences={data.datePreferences}
/>
{/if}

<DashboardPanel
  title="Comments"
  icon={comments}
  seeMore={{ href: `${user}/comments/all/all/added`, text: 'All Comments' }}
>
  {#if data.comments.length > 0}
    <div class="comments">
      {#each data.comments as row (row.comment.id)}
        <div class="comment"><UserCommentWithPoster {row} {viewer} datePreferences={data.datePreferences} /></div>
      {/each}
    </div>
  {:else}
    <div class="empty"><NoData>{hasnt('commented on anything yet.')}</NoData></div>
  {/if}
</DashboardPanel>

<style>
.comments {
  margin-block-start: var(--gutter);
}

.comment {
  margin-block-end: var(--gutter);
}

.favorites {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gutter);
  margin-block: var(--gutter) var(--space-lg-block);

  @media (max-width: 991px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    /* OG's col-sm-6: the third card hides. */
    & > :global(:nth-child(3)) {
      display: none;
    }
  }

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);

    & > :global(:nth-child(3)) {
      display: flex;
    }
  }
}

.empty {
  margin-block-start: var(--gutter);
}
</style>

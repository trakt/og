<!--
  The dashboard's Social Feed: up to 12 plays by the people the viewer
  follows in the last seven days, six to a row, under a single Following pill tab. Pass the unawaited
  `fetchSocialFeed` promise from the loader, so the page streams in and this panel spins until it lands, and fails on
  its own if it doesn't.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import PillTabs from '$lib/components/tabs/PillTabs.svelte';
import type { SocialPlay } from '$lib/dashboard/toSocialPlay';
import userGroup from '$lib/icons/thin/user-group.svg?raw';
import DashboardPanel from './DashboardPanel.svelte';
import SocialPlayCard from './SocialPlayCard.svelte';

const { plays }: { plays: Promise<readonly SocialPlay[]> } = $props();

const TABS = [{ id: 'following', label: 'Following' }] as const;
</script>

{#snippet panel(loading: boolean, content: Snippet)}
  <DashboardPanel
  --panel-bg="var(--color-social-feed-bg)"
  --panel-padding-end="var(--gutter)"
  title="Social Feed"
  icon={userGroup}
  {loading}
>
  <div class="tabs">
    <PillTabs label="Social Feed" tabs={TABS}>
        {#snippet panel()}
          <div class="body">{@render content()}</div>
        {/snippet}
      </PillTabs>
  </div>
</DashboardPanel>
{/snippet}

{#await plays}
  {@render panel(true, pending)}
{:then items}
  {#snippet cards()}
    {#if items.length === 0}
      <div class="notice">
  <NoData>Follow some Trakt members to see what they're watching.</NoData>
</div>
    {:else}
      <div class="cards">
  <PosterGrid>
          {#each items as play (play.key)}
            <SocialPlayCard {play} />
          {/each}
        </PosterGrid>
</div>
    {/if}
  {/snippet}
  {@render panel(false, cards)}
{:catch}
  {@render panel(false, failed)}
{/await}

{#snippet pending()}{/snippet}

{#snippet failed()}
  <div class="notice">
  <NoData>The Social Feed didn't load. Refresh the page to try again.</NoData>
</div>
{/snippet}

<style>
/* OG's `.pill-tab-links.with-icon`: the pill lines up with the heading's text, the posters run the full width. */
.tabs {
  margin-inline-start: var(--space-help-text-inline);

  & :global([role='tabpanel']) {
    margin-inline-start: calc(-1 * var(--space-help-text-inline));
  }
}

.body {
  --color-no-data-bg: var(--color-social-feed-no-data-bg);
}

/* OG's alert sat in the posters row, which kept 20px above it and, like each card, 20px under it. With the row's own
   20px and the panel's, that leaves 40px under the cards and 60px under the alert. */
.notice {
  padding-block: var(--gutter);
}

/* the panel fades in when its data lands, as OG's lazy panels did. */
.cards {
  animation: fade-in var(--transition-card) ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cards {
    animation: none;
  }
}
</style>

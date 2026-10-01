<script lang="ts">
import Dialog from '$lib/components/dialog/Dialog.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import Header from '$lib/components/header/Header.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import WatchNow from '$lib/components/watchnow/WatchNow.svelte';
import type { WatchNowButton } from '$lib/components/watchnow/watchNow';
import Icon from '$lib/icons/Icon.svelte';
import check from '$lib/icons/trakt/check-thick.svg?raw';

const sorts = ['Watched Date', 'Title', 'Released', 'Runtime'];
const placements = ['top', 'right', 'bottom', 'left'] as const;
const plays = '12 plays\n1 day 2 hours'; // lines break at \n, like OG's <br>

let sort = $state('Watched Date');
let reportOpen = $state(false);
let watchOpen = $state(false);
let theme = $state('light');

// The modal loads Fight Club's real offers from the API when it opens.
const logo = (slug: string) => `https://media.trakt.tv/watchnow/sources/${slug}.webp`;
const watchNow: WatchNowButton = {
  path: '/movies/fight-club-1999',
  tiles: [
    { slug: 'apple_tv', name: 'Apple TV', color: '#000000', logo: logo('apple_tv'), href: '#apple' },
    {
      slug: 'google_play_movies',
      name: 'Google Play',
      color: '#607d8b',
      logo: logo('google_play_movies'),
      href: '#gp',
    },
  ],
  count: 5,
  favorites: 1,
  cinemaOnly: false,
  hidden: false,
  country: 'us',
  favoriteKeys: ['us-youtube'],
};

$effect(() => {
  document.documentElement.dataset.theme = theme;
  return () => delete document.documentElement.dataset.theme;
});
</script>

<svelte:head>
  <title>Dialog, dropdown, toast and tooltip · og design system</title>
</svelte:head>

<Header user={null} />

<main>
  <section>
    <h1>Dialog, dropdown, toast and tooltip</h1>
    <p>
      OG's modals, Bootstrap dropdowns and tooltips, and toastr bars, on native <code>&lt;dialog&gt;</code> and the
      Popover API.
    </p>
    <label>
      Theme
      <select bind:value={theme}>
        <option value="light">Light (OG default)</option>
        <option value="dark">Dark (dark knight)</option>
      </select>
    </label>

    <h2>Dropdown</h2>
    <Dropdown>
      {#snippet trigger()}{sort}{/snippet}
      <ul>
        {#each sorts as option (option)}
          <li>
            <button type="button" aria-current={option === sort} onclick={() => (sort = option)}>{option}</button>
          </li>
        {/each}
      </ul>
      <hr />
      <ul>
        <li><a href="#top">A link row</a></li>
      </ul>
    </Dropdown>

    <div class="dark-band">
      <Dropdown variant="transparent" label="Media type: {sort}">
        {#snippet trigger()}{sort}{/snippet}
        <ul>
          {#each sorts as option (option)}
            <li><button type="button" onclick={() => (sort = option)}>{option}</button></li>
          {/each}
        </ul>
      </Dropdown>
    </div>

    <h2>Dialog</h2>
    <div class="row">
      <button type="button" onclick={() => (reportOpen = true)}>Report item (500px)</button>
      <button type="button" onclick={() => (watchOpen = true)}>Watch now (360px, click outside closes)</button>
    </div>

    <h2>Watch Now</h2>
    <p>The sidebar block under a summary poster. The button opens the where-to-watch modal.</p>
    <div class="row">
      <div class="sidebar-demo">
        <WatchNow button={watchNow} title="Fight Club" year={1999} />
      </div>
    </div>

    <h2>Toast</h2>
    <div class="row">
      <button type="button" onclick={() => toast.success('Fight Club added to your watchlist.')}>Success</button>
      <button type="button" onclick={() => toast.error('Something went wrong. Please try again.')}>Error</button>
    </div>

    <h2>Tooltip</h2>
    <p>Hover or tab to a trigger. Esc hides it; touch never opens one.</p>
    <div class="row tooltips">
      {#each placements as placement (placement)}
        <Tooltip text="Tooltip on {placement}" {placement}>
          {#snippet trigger(tooltip)}
            <button type="button" {...tooltip}>{placement}</button>
          {/snippet}
        </Tooltip>
      {/each}
      <Tooltip text={plays} placement="bottom">
        {#snippet trigger(tooltip)}
          <button type="button" class="icon-button" aria-label="Add to watched history" {...tooltip}>
            <Icon svg={check} />
          </button>
        {/snippet}
      </Tooltip>
      <Tooltip placement="bottom">
        {#snippet trigger(tooltip)}
          <a href="#top" {...tooltip}>Markup inside</a>
        {/snippet}
        <em>Added to library on</em><br />September 1, 2026
      </Tooltip>
      <Tooltip text="A longer tooltip wraps once it reaches OG's 400px limit, which Bootstrap's default of 200px was raised to for titles like these ones.">
        {#snippet trigger(tooltip)}
          <button type="button" {...tooltip}>Long</button>
        {/snippet}
      </Tooltip>
    </div>
  </section>
</main>

<Dialog bind:open={reportOpen} title="Report item" size="md">
  <form method="dialog" class="form">
    <label>
      Reason
      <select>
        <option></option>
        <option>Duplicate</option>
        <option>Invalid Metadata</option>
      </select>
    </label>
    <label>
      Message
      <textarea rows="3"></textarea>
    </label>
    <button type="submit">Send</button>
  </form>
</Dialog>

<Dialog bind:open={watchOpen} title="Watch now" lightDismiss>
  <p>Fight Club streams on 2 services in the United States.</p>
</Dialog>

<style>
/* Where the transparent variant sits: discover's black titles column. */
.dark-band {
  margin-block-start: var(--gutter);
  padding: var(--gutter);
  background-color: var(--color-recent-comments-titles-bg);
}

.sidebar-demo {
  inline-size: 173px;
}

main {
  padding-block-start: var(--header-height);
}

section {
  min-block-size: 100vh;
  padding: var(--gutter);
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm-inline);
  margin-block-start: var(--space-sm-inline);
}

.tooltips {
  align-items: center;
  gap: var(--gutter);
  padding-block: calc(var(--gutter) * 3);
  padding-inline: calc(var(--gutter) * 2);
}

.icon-button {
  color: var(--brand-tertiary);
  font-size: var(--font-size-quick-icon);
}

.form {
  display: grid;
  gap: var(--space-panel);

  & label {
    display: grid;
    gap: var(--space-sm-block);
  }
}
</style>

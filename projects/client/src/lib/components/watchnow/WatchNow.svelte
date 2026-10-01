<!--
  Where to watch, under a summary's sidebar poster : two service tiles, favorites
  first, over a "Watch Now / 6 services" button that opens the where-to-watch modal. `phone` is the action-stack
  version OG showed under 768px instead: the button with the tiles on its right.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import play from '$lib/icons/solid/play.svg?raw';
import ticket from '$lib/icons/solid/ticket.svg?raw';
import { countLabel } from '$lib/utils/countLabel';
import ServiceTile from './ServiceTile.svelte';
import type { WatchNowButton } from './watchNow.ts';
import WatchNowDialog from './WatchNowDialog.svelte';

interface Props {
  button: WatchNowButton;
  /** For the modal's header: "Fight Club", 1999 and the item's fanart. */
  title: string;
  year?: number | null;
  fanart?: string;
  phone?: boolean;
}

const { button, title, year, fanart, phone = false }: Props = $props();
let open = $state(false);

const services = $derived(button.count - button.favorites);
const noun = $derived(button.cinemaOnly ? 'cinema' : phone ? 'streaming service' : 'service');
const under = $derived(
  [
    button.favorites > 0 && `${countLabel(button.favorites, 'favorite')}${services > 0 ? ' + ' : ''}`,
    (services > 0 || button.favorites === 0) && countLabel(services, noun),
  ]
    .filter(Boolean)
    .join(''),
);
</script>

{#if !button.hidden}
  <div class={['watch-now', { phone }]}>
    {#if button.tiles.length > 0}
      <div class="tiles">
        {#each button.tiles as link (link.slug)}
          <ServiceTile {link} />
        {/each}
      </div>
    {/if}
    <button type="button" class="open" aria-haspopup="dialog" onclick={() => (open = true)}>
      <span class="icon"><Icon svg={button.cinemaOnly ? ticket : play} fixedWidth /></span>
      <span class="text">
        <span class="main-info">{button.cinemaOnly ? 'Buy Tickets' : 'Watch Now'}</span>
        <span class="under-info">{under}</span>
      </span>
    </button>
  </div>
  <WatchNowDialog bind:open {button} {title} {year} {fanart} />
{/if}

<style>
.watch-now:not(.phone) {
  color: var(--color-text-inverse);

  & .tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 10px 5px 0;
    background-color: var(--color-watch-now-tiles-bg);
    box-shadow: var(--shadow-summary-poster);
    --service-width: 100%;
    --service-height: var(--watch-now-tile-height);
    --service-padding: 0 5px 10px;

    @media (width < 1200px) {
      --service-height: var(--watch-now-tile-height-md);
    }

    @media (width < 992px) {
      --service-height: var(--watch-now-tile-height-sm);
    }
  }

  & .open {
    display: flex;
    align-items: flex-start;
    inline-size: 100%;
    padding: 5px;
    border: 0;
    border-radius: 0 0 4px 4px;
    background-color: var(--color-watch-now-bg);
    box-shadow: var(--shadow-watch-now);
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
    transition: background-color var(--transition-card);

    &:is(:hover, :focus-visible) {
      background-color: var(--brand-primary);

      & .under-info {
        color: inherit;
      }
    }
  }

  & .icon {
    margin: 0 4px 0 2px;
    font-size: 19px;
    line-height: 30px;
  }

  & .main-info {
    display: block;
    font-family: var(--font-headings);
    font-weight: var(--font-weight-headings);
    text-transform: uppercase;
  }

  & .under-info {
    display: block;
    margin-block: -2px 2px;
    color: var(--color-watch-now-under);
    font-size: 11px;
    line-height: 1;
    transition: color var(--transition-card);
  }
}

/* Only under 768px, where the sidebar is gone: a action button with the tiles on its right. */
.phone {
  position: relative;
  display: none;
  margin-block-end: 5px;
  color: var(--color-text-inverse);

  @media (width < 768px) {
    display: block;
  }

  & .tiles {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 10px;
    z-index: 1;
    display: flex;
    padding: 10px 5px 0;
    --service-width: var(--watch-now-phone-tile-width);
    --service-height: var(--watch-now-tile-height-sm);
    --service-padding: 0 5px;
  }

  & .open {
    display: flex;
    align-items: center;
    inline-size: 100%;
    min-block-size: calc(var(--action-height) + 2px);
    padding: 0;
    border: 1px solid var(--color-watch-now-bg);
    background-color: var(--color-watch-now-bg);
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
  }

  & .icon {
    inline-size: var(--action-icon-width);
    padding-inline: 5px;
    font-size: var(--font-size-action-icon);
    line-height: 1;
  }

  & .main-info {
    display: block;
    font-family: var(--font-headings);
    font-size: var(--font-size-action);
    font-weight: var(--font-weight-headings);
    text-transform: uppercase;
  }

  & .under-info {
    display: block;
    font-size: var(--font-size-small);
    line-height: 1;
  }
}
</style>

<!--
  OG's filter upsell over the chart grid: the funnel, a line
  about advanced filters, the rating sites' logos, and Close for VIPs or Get VIP for everyone else, whose whole
  banner links to the VIP page. Signed-in non-VIPs also get a small x. OG kept the dismissal on the account; og
  keeps it in a cookie, which the loader reads so a dismissed banner never flashes in.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import timesRegular from '$lib/icons/regular/xmark.svg?raw';
import filtersIcon from '$lib/icons/solid/filters.svg?raw';
import xmark from '$lib/icons/solid/xmark.svg?raw';
import services from '$lib/assets/filters-upsell-services.png';
import { FILTERS_UPSELL_COOKIE } from './filtersUpsellCookie.ts';

interface Props {
  vip: boolean;
  signedIn: boolean;
}

const { vip, signedIn }: Props = $props();
let hidden = $state(false);

function hide() {
  hidden = true;
  document.cookie = `${FILTERS_UPSELL_COOKIE}=1; path=/; samesite=lax; max-age=31536000`;
}
</script>

<!-- The VIP page is an OG route og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#if !hidden}
  <aside class={['upsell', { vip }]} aria-label="Advanced filters">
    <span class="icon"><Icon svg={filtersIcon} /></span>
    <p class="text">
      Quickly find what you need using Trakt's advanced options to create custom filters by genre, decade, ratings,
      and more. Give it a try!
    </p>
    <span class="image"><img src={services} alt="IMDB, TMDB, Rotten Tomatoes, and more" /></span>
    <span class="hide-notice">
      {#if vip}
        <button type="button" class="notice-button" onclick={hide}>Close<Icon svg={timesRegular} /></button>
      {:else}
        <a class="notice-button get-vip" href="/vip/filtering">Get VIP</a>
      {/if}
    </span>
    {#if signedIn && !vip}
      <button type="button" class="hide-x" aria-label="Hide" onclick={hide}><Icon svg={xmark} /></button>
    {/if}
  </aside>
{/if}

<style>
.upsell {
  position: relative;
  display: grid;
  grid-template-columns: var(--upsell-icon-width) minmax(0, 1fr) var(--upsell-image-width) var(--upsell-action-width);
  align-items: center;
  margin: var(--space-lg-block);
  border-radius: var(--radius-upsell);
  background-color: var(--brand-tertiary);
  color: var(--color-frame-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-nav);
  font-weight: var(--font-weight-headings);

  @media (max-width: 1199px) {
    grid-template-columns: var(--upsell-icon-width) minmax(0, 1fr) var(--upsell-image-width-md)
      var(--upsell-action-width);
  }

  @media (max-width: 767px) {
    grid-template-columns: var(--upsell-icon-width) minmax(0, 1fr);
    font-size: var(--font-size-base);

    .image,
    .hide-notice {
      display: none;
    }
  }
}

.icon {
  padding-inline-start: var(--space-lg-block);
  font-size: var(--font-size-upsell-icon);
  text-align: center;
}

.text {
  margin: 0;
  padding-block: var(--space-lg-block);
  text-wrap: balance;
}

.image img {
  display: block;
  inline-size: 100%;
}

.hide-notice {
  text-align: end;
}

.notice-button {
  display: inline-block;
  min-block-size: 0;
  margin-inline-end: var(--filter-row-gap);
  padding: var(--space-sm-block) var(--space-sm-inline);
  border: 0;
  border-radius: var(--radius-upsell);
  background-color: var(--color-upsell-button);
  color: var(--color-frame-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-base);
  text-decoration: none;
  text-transform: uppercase;
  vertical-align: middle;

  &:is(:hover, :focus-visible) {
    background-color: var(--color-upsell-button-hover);
    color: var(--color-frame-text);
  }

  @media (prefers-reduced-motion: no-preference) {
    transition: background-color var(--transition-frame);
  }

  & :global(.icon) {
    margin: -4px 0 0 var(--space-xs-inline);
    font-size: var(--font-size-nav);
    vertical-align: middle;
  }
}

/* The whole banner is the Get VIP link for non-VIPs . */
.get-vip::after {
  content: '';
  position: absolute;
  inset: 0;
}

.hide-x {
  position: absolute;
  inset-block-start: -2px;
  inset-inline-end: 3px;
  z-index: 1;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-upsell-x);
  font-size: var(--font-size-small);

  &:is(:hover, :focus-visible) {
    color: var(--color-frame-text);
  }
}
</style>

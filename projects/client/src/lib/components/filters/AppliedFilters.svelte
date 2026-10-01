<!--
  The sidebar's applied filters: a tag per filter under "Advanced
  Filters", struck through when excluded, rating tags led by the site's logo, and watch now as service tiles, then
  Clear and Edit Filters. OG showed them to VIPs only; everyone else with filters in the URL gets the VIP alert.
  OG's Save Filters button is deferred with saved filters, so Edit Filters (reopen the panel) takes its place.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import traktMark from '$lib/icons/kit/trakt-logomark-circle-white.svg?raw';
import arrow from '$lib/icons/solid/arrow-right-long.svg?raw';
import pencil from '$lib/icons/solid/pencil.svg?raw';
import anyBundle from '$lib/assets/channels/any.png';
import freeBundle from '$lib/assets/channels/free.png';
import subscriptionsBundle from '$lib/assets/channels/subscriptions.png';
import imdbLogo from '$lib/assets/sites/imdb-clean.png';
import rtAudience from '$lib/assets/sites/rt/audience-upright.svg';
import rtFresh from '$lib/assets/sites/rt/tomatometer-fresh.svg';
import traktLogo from '$lib/assets/sites/trakt.png';
import ServiceTile from '../watchnow/ServiceTile.svelte';
import type { FilterTag, TagSite } from './filterTags.ts';
import type { WatchNowBundle, WatchNowTile } from './watchNowFilter.ts';

interface Props {
  tags: readonly FilterTag[];
  tiles: readonly WatchNowTile[];
  vip: boolean;
  clearHref: string;
  onedit: () => void;
}

const { tags, tiles, vip, clearHref, onedit }: Props = $props();

const sites: Record<TagSite, { logo: string; name: string }> = {
  trakt: { logo: traktLogo, name: 'Trakt' },
  imdb: { logo: imdbLogo, name: 'IMDb' },
  rt: { logo: rtFresh, name: 'Rotten Tomatoes' },
  'rt-audience': { logo: rtAudience, name: 'Rotten Tomatoes Audience' },
};

const bundles: Record<WatchNowBundle, { logo: string; color: string }> = {
  any: { logo: anyBundle, color: 'var(--color-bundle-any)' },
  free: { logo: freeBundle, color: 'var(--color-bundle-free)' },
  subscriptions: { logo: subscriptionsBundle, color: 'var(--color-bundle-subscriptions)' },
};
</script>

<!-- The VIP page is an OG route og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#if !vip}
  <a class="vip-required" href="/vip/filtering">
    Sign up for <Icon svg={traktMark} /> <b>VIP</b> to unlock watch now and advanced filtering! <Icon svg={arrow} />
  </a>
{:else}
  <div class="applied">
    {#if tags.length > 0}
      <h4>Advanced Filters</h4>
      <ul class="tags">
        {#each tags as tag (tag.id)}
          <li class={{ without: tag.without, 'with-site': tag.site }}
          >{#if tag.site}<span class="site"><img src={sites[tag.site].logo} alt="{sites[tag.site].name} " /></span
            >{/if}{#if tag.without}<span class="visually-hidden">Without </span>{/if}{tag.text}</li>
        {/each}
      </ul>
    {/if}
    {#if tiles.length > 0}
      <h4>Available to watch on</h4>
      <ul class="services">
        {#each tiles as tile (tile.id)}
          <li class={{ 'has-country': tile.kind === 'bundle' }} data-country={tile.kind === 'bundle' ? tile.country : undefined}>
            {#if tile.kind === 'bundle'}
              <ServiceTile link={{ slug: tile.id, href: '', name: `${tile.name} (${tile.country})`, ...bundles[tile.id] }} />
            {:else}
              <ServiceTile link={{ slug: tile.id, href: '', ...tile.source }} />
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    <div class="buttons">
      <a class="button clear" href={clearHref}>Clear</a>
      <button type="button" class="button edit" onclick={onedit}>Edit Filters<Icon svg={pencil} /></button>
    </div>
  </div>
{/if}

<style>
.vip-required {
  display: block;
  margin-block-start: var(--filter-row-gap);
  padding: var(--filter-alert-padding);
  border-radius: var(--radius-filter-control);
  background-color: var(--brand-primary);
  color: var(--color-frame-text);
  font-size: var(--font-size-filter-control);
  line-height: 1.2;
  text-decoration: none;
  text-wrap: balance;

  &:is(:hover, :focus-visible) {
    color: var(--color-frame-text);
  }
}

/* A red rule down the left, tucked under the current chart's link. */
.applied {
  margin: var(--space-lg-block) 0;
  padding-inline-start: var(--filter-applied-indent);
  border-inline-start: 2px solid var(--brand-primary);
}

h4 {
  margin: var(--filter-row-gap) 0 var(--filter-label-gap);
  color: var(--color-filter-label);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
  text-transform: uppercase;

  &:first-child {
    margin-block-start: 0;
  }
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.tags {
  max-block-size: var(--filter-tags-max-height);
  overflow-y: auto;
  scrollbar-width: none;

  & li {
    display: inline-block;
    margin: 0 var(--space-xs-inline) var(--space-xs-inline) 0;
    vertical-align: top;
    padding: 0 var(--space-xs-inline);
    border-radius: var(--radius-filter-control);
    background-color: var(--color-filter-tag-bg);
    color: var(--color-filter-control-text);
    font-family: var(--font-headings);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-headings);
    letter-spacing: 0.2px;
    line-height: var(--filter-tag-height);
    white-space: nowrap;
  }

  & .without {
    text-decoration: line-through;
  }

  & .with-site {
    padding-inline-start: 0;
    overflow: hidden;
  }
}

.site {
  display: flex;
  float: inline-start;
  align-items: center;
  block-size: var(--filter-tag-height);
  margin-inline-end: var(--space-xs-inline);
  padding-inline-end: var(--space-xs-inline);
  background-color: var(--color-frame);

  & img {
    inline-size: var(--filter-tag-site);
    block-size: var(--filter-tag-site);
    margin-block-start: -2px;
  }
}

.services {
  display: grid;
  grid-template-columns: repeat(3, var(--filter-service-width));
  margin: calc(-1 * var(--space-lg-block)) calc(-1 * var(--space-xs-inline)) 0;
  --service-width: var(--filter-service-width);
  --service-height: var(--filter-service-height);
  --service-padding: var(--space-lg-block) var(--space-xs-inline) 0;

  & li {
    position: relative;
  }
}

/* A bundle for one country carries its code, like OG's `data-country`. */
.has-country::after {
  content: attr(data-country);
  position: absolute;
  inset-block-start: var(--filter-country-top);
  inset-inline-end: 0;
  padding: 1px 3px;
  border-radius: var(--radius-filter-control);
  background-color: var(--color-filter-tag-bg);
  color: var(--color-filter-control-text);
  font-family: var(--font-headings);
  font-size: 9px;
  font-weight: var(--font-weight-headings-heavy);
  line-height: 1;
}

.buttons {
  display: grid;
  grid-template-columns: var(--filter-close-width) auto;
  gap: var(--space-lg-block);
  margin-block-start: var(--filter-row-gap);
}

.button {
  display: block;
  min-block-size: 0;
  padding: var(--space-base-block) var(--space-base-inline);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-frame-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-nav);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-base);
  text-align: start;
  text-decoration: none;

  @media (prefers-reduced-motion: no-preference) {
    transition: background-color var(--transition-frame);
  }

  & :global(.icon) {
    float: inline-end;
    margin-block-start: 2px;
  }
}

.clear {
  background-color: var(--color-btn-close-dark-bg);
  text-align: center;

  &:is(:hover, :focus-visible) {
    background-color: var(--color-btn-close-dark-bg-hover);
    color: var(--color-frame-text);
  }
}

.edit {
  background-color: var(--color-btn-alt-bg);

  &:is(:hover, :focus-visible) {
    background-color: var(--color-btn-alt-bg-hover);
  }
}

.visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>

<!-- OG's streaming chips below a sortable page's title row. Shared with watchlist and favorites. -->
<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import ServiceTile from '$lib/components/watchnow/ServiceTile.svelte';
import type { WatchNowBundle, WatchNowTile } from '$lib/components/filters/watchNowFilter';
import any from '$lib/assets/channels/any.png';
import free from '$lib/assets/channels/free.png';
import subscriptions from '$lib/assets/channels/subscriptions.png';
const { tiles }: { tiles: readonly WatchNowTile[] } = $props();
const bundles: Record<WatchNowBundle, { logo: string; color: string }> = {
  any: { logo: any, color: 'var(--color-bundle-any)' },
  free: { logo: free, color: 'var(--color-bundle-free)' },
  subscriptions: { logo: subscriptions, color: 'var(--color-bundle-subscriptions)' },
};
</script>
{#if tiles.length > 0}
  <section class="chips" aria-label="Applied streaming services">
  <Container>
    <h3>Available to watch on</h3>
    <ul>
        {#each tiles as tile (tile.id)}
          <li class:has-country={tile.kind === 'bundle'} data-country={tile.kind === 'bundle' ? tile.country : undefined}>
            <ServiceTile link={tile.kind === 'service'
              ? { ...tile.source, slug: tile.id, href: '' }
              : { ...bundles[tile.id], slug: tile.id, href: '', name: `${tile.name} (${tile.country})` }} />
          </li>
        {/each}
      </ul>
  </Container>
</section>
{/if}
<style>
.chips {
  background-color: var(--color-watchnow-chips-bg);
  padding-block: var(--subnav-text-padding);
}
h3 {
  margin: var(--watchnow-chips-heading-margin);
  color: var(--color-filter-label);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings);
  text-transform: uppercase;
}
ul {
  display: flex;
  flex-wrap: wrap;
  margin: var(--watchnow-chips-margin);
  padding: 0;
  list-style: none;
  --service-width: var(--watchnow-chips-width);
  --service-height: var(--watchnow-chips-height);
  --service-padding: var(--watchnow-chips-padding);
}
li {
  position: relative;
}
.has-country::after {
  content: attr(data-country);
  position: absolute;
  inset-block-start: var(--watchnow-chips-country-top);
  inset-inline-end: var(--space-xs-inline);
  padding: var(--watchnow-chips-country-padding);
  border-radius: var(--radius-filter-control);
  background-color: var(--color-filter-tag-bg);
  color: var(--color-filter-control-text);
  font-size: var(--font-size-watchnow-chips-country);
  line-height: 1;
}
</style>

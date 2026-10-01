<!--
  A grey tile in the notes/videos box under a summary's overview (OG's `.affiliate-links .section a`): an icon, then
  an optional small uppercase line over the label. A link with `href`, a button without. Other attributes pass through.
  A section can shrink the icon with `--summary-tile-icon-size` and `--summary-tile-icon-top`.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

type Props = {
  icon: string;
  /** The small uppercase line, e.g. "During" or "Add". Without it the label sits on one line. */
  price?: string;
  site: string;
} & (HTMLAnchorAttributes | HTMLButtonAttributes);

const { icon, price, site, ...rest }: Props = $props();
</script>

{#snippet content()}
  <span class="icon"><Icon svg={icon} /></span>
  <span class="text">{#if price}<span class="price">{price}</span>{/if}<span class="site">{site}</span></span>
{/snippet}

{#if 'href' in rest && rest.href}
  <a class={['tile', { 'one-liner': !price }]} {...rest as HTMLAnchorAttributes}>{@render content()}</a>
{:else}
  <button type="button" class={['tile', { 'one-liner': !price }]} {...rest as HTMLButtonAttributes}>
    {@render content()}
  </button>
{/if}

<style>
.tile {
  display: inline-flex;
  min-block-size: 0;
  margin: 0 10px 10px 0;
  padding: 0;
  border: 1px solid var(--color-summary-tile-bg);
  border-radius: var(--radius-code);
  background-color: var(--color-summary-tile-bg);
  color: var(--color-summary-tile-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  line-height: inherit;
  text-align: start;
  text-decoration: none;
  vertical-align: top;
  transition: all var(--transition-card);

  &:is(:hover, :focus-visible) {
    border-color: var(--color-summary-tile-hover-bg);
    background-color: var(--color-summary-tile-hover-bg);
    color: var(--color-card-text);
    text-decoration: none;
  }
}

.icon {
  inline-size: var(--video-icon-width);
  padding-block-start: var(--summary-tile-icon-top, 5px);
  font-size: var(--summary-tile-icon-size, var(--font-size-video-icon));
  text-align: center;
}

.text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4px 7px 3px 0;
  line-height: 1.2;
  white-space: nowrap;

  .one-liner & {
    line-height: 28px;
  }
}

.price {
  font-size: var(--font-size-video-scene);
  text-transform: uppercase;
}

.site {
  font-size: var(--font-size-summary-label);
  font-weight: var(--font-weight-headings);
}
</style>

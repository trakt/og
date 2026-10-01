<!--
  A panel's heading row: the h2 with its icon and a spinner while loading, and on the right the Customize gear and
  the see-more link. DashboardPanel puts one on top; the profile's Most Watched columns each have their own.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import Spinner from '$lib/components/loading/Spinner.svelte';
import SeeMore from '$lib/components/see-more/SeeMore.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import gear from '$lib/icons/thin/gear.svg?raw';

interface Props {
  /** The h2's id, for the section's `aria-labelledby`. */
  id: string;
  title: string;
  /** The heading's icon, as raw SVG. */
  icon: string;
  loading?: boolean;
  seeMore?: { href: string; text: string };
  /** The gear, "Customize" in OG, pointing at the settings for this panel. */
  customizeHref?: string;
  /** OG's `.feed-icons` left of the gear: the schedule's calendar-clock to the notification settings. */
  feeds?: Snippet;
  /** OG's `h2.section`, with 28px above it instead of 20px (Recently Watched). */
  section?: boolean;
}

const { id, title, icon, loading = false, seeMore, customizeHref, feeds, section = false }: Props = $props();
</script>

<!-- The settings page isn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class={['heading', { section }]}>
  <h2 {id}>
    <span class="heading-icon"><Icon svg={icon} fixedWidth /></span>{title}
    {#if loading}<span class="spinner"><Spinner /></span>{/if}
  </h2>
  <div class="links">
    {#if feeds}
      <span class="feeds">{@render feeds()}</span>
    {/if}
    {#if customizeHref}
      <Tooltip text="Customize">
        {#snippet trigger(tooltip)}
          <a class="customize" href={customizeHref} aria-label="Customize" {...tooltip}><Icon svg={gear} /></a>
        {/snippet}
      </Tooltip>
    {/if}
    {#if seeMore}
      <SeeMore {...seeMore} />
    {/if}
  </div>
</div>

<style>
.heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--gutter);
}

h2 {
  margin-block-end: 0;
}

.heading-icon {
  margin-inline-end: var(--space-heading-icon);

  & :global(.icon) {
    vertical-align: top;
  }
}

.spinner {
  margin-inline-start: var(--space-heading-icon);
}

.links {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-customize);
  margin-block-start: var(--line-height-computed);
}

/* OG floated the links inside the h2, so they move down with it. */
.section :is(h2, .links) {
  margin-block-start: var(--space-heading-section);
}

.feeds {
  display: flex;
  align-items: center;
  margin-inline-end: calc(var(--space-feed-icons) - var(--space-customize));
}

.customize {
  color: var(--color-customize);
  font-size: var(--font-size-customize-icon);
  line-height: 1;

  &:is(:hover, :focus-visible) {
    color: var(--color-customize);
  }
}
</style>

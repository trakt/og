<!--
  One dashboard panel: an h2 with its icon and a
  spinner while loading, the see-more link and the Customize gear on the right, a gray help line, then the content.
  Set `--panel-bg` for the panel's background, and `--panel-padding-end` or `--panel-min-height` where OG's section
  had its own. The footer snippet goes after the content, outside the page column,
  which is where the less and more pill hangs.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import Container from '$lib/components/container/Container.svelte';
import PanelHeading from './PanelHeading.svelte';
import PanelHelp from './PanelHelp.svelte';

interface Props {
  title: string;
  /** The heading's icon, as raw SVG. */
  icon: string;
  loading?: boolean;
  seeMore?: { href: string; text: string };
  /** The gear, "Customize" in OG, pointing at the dashboard settings. */
  customizeHref?: string;
  /** Icon links left of the gear (PanelHeading). */
  feeds?: Snippet;
  help?: Snippet;
  /** OG's `h2.section` heading (PanelHeading). */
  section?: boolean;
  children: Snippet;
  footer?: Snippet;
}

const { title, icon, loading = false, seeMore, customizeHref, feeds, help, section, children, footer }: Props =
  $props();
const id = $props.id();
</script>

<section class="dashboard-panel" aria-labelledby={id} aria-busy={loading}>
  <Container>
    <PanelHeading {id} {title} {icon} {loading} {seeMore} {customizeHref} {feeds} {section} />
    {#if help}
      <PanelHelp>{@render help()}</PanelHelp>
    {/if}
    {@render children()}
  </Container>
  {@render footer?.()}
</section>

<style>
.dashboard-panel {
  position: relative;
  min-block-size: var(--panel-min-height, auto);
  padding-block-end: var(--panel-padding-end, var(--space-lg-block));
  background-color: var(--panel-bg, var(--color-surface));
}
</style>

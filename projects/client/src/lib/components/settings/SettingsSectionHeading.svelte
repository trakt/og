<!--
  A settings page's section title (OG's `h2` with a thin `fa-fw` icon, then `h3.help-text`): "Data Imports" and
  "Recent data imports from other services." on the Data tab. `title` can bold part of it, like "Sync ID **157**".
  `aside` floats right of the heading, like the Known Issues "Expand".
    <SettingsSectionHeading icon={cloudBinary} help="Some details about this sync.">
      {#snippet title()}Sync ID <b>157</b>{/snippet}
    </SettingsSectionHeading>
-->
<script lang="ts">
import PanelHelp from '$lib/components/dashboard/PanelHelp.svelte';
import Icon from '$lib/icons/Icon.svelte';
import type { Snippet } from 'svelte';

interface Props {
  /** The heading's icon, as raw SVG. */
  icon: string;
  title: Snippet;
  help?: string;
  aside?: Snippet;
  id?: string;
}

const { icon, title, help, aside, id }: Props = $props();
</script>

<div class="heading">
  <h2 {id}><span class="icon"><Icon svg={icon} fixedWidth /></span>{@render title()}</h2>
  {#if aside}<div class="aside">{@render aside()}</div>{/if}
</div>
<div class="help">
  {#if help}<PanelHelp>{help}</PanelHelp>{/if}
</div>

<style>
.heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--gutter);
  margin-block-start: var(--settings-section-gap);
}

h2 {
  margin: 0;
}

.icon {
  margin-inline-end: var(--space-heading-icon);

  & :global(.icon) {
    vertical-align: top;
  }
}

.aside {
  flex-shrink: 0;
  color: var(--color-settings-heading-aside);
}

.help {
  margin-block-end: var(--settings-section-gap);
}
</style>

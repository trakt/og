<!--
  One block of the Advanced tab: a `SettingsSectionHeading` (OG's h2 with a thin icon and its `h3.help-text`), then
  the block's content, indented under the title when it's a row of buttons (OG's `.buttons.data`). `extra` sits after
  the title, like the VIP label. It goes inside the tab's `<section>` bands, as OG's blocks did.
    <SettingsBlock icon={rotate} title="Reset Browser Data" help="Re-cache all your Trakt browser data...">
      <SettingsButton onclick={reset}>Reset Data</SettingsButton>
    </SettingsBlock>
-->
<script lang="ts">
import SettingsSectionHeading from '$lib/components/settings/SettingsSectionHeading.svelte';
import type { Snippet } from 'svelte';

interface Props {
  icon: string;
  title: string;
  help: string;
  /** Full-width content, like the limits table, instead of an indented row of buttons. */
  wide?: boolean;
  extra?: Snippet;
  children: Snippet;
}

const { icon, title: text, help, wide = false, extra, children }: Props = $props();
</script>

<div class="block">
  <SettingsSectionHeading {icon} {help}>
    {#snippet title()}{text}{@render extra?.()}{/snippet}
  </SettingsSectionHeading>
  <div class={['content', { wide }]}>{@render children()}</div>
</div>

<style>
.block {
  display: flow-root;
}

.content:not(.wide) {
  display: flex;
  flex-wrap: wrap;
  gap: var(--settings-button-gap);
  padding-block-end: var(--settings-action-bottom);
  padding-inline-start: var(--space-help-text-inline);

  @media (max-width: 767px) {
    padding-inline-start: var(--settings-block-indent-phone);
  }
}
</style>

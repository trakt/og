<!-- Rewatching preferences are shown to everyone; saving requires a supported account. -->
<script lang="ts">
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsPanelLink from '$lib/components/settings/SettingsPanelLink.svelte';
import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
import type { SettingsDraft } from './SettingsDraft';

let { draft = $bindable() }: { draft: SettingsDraft } = $props();

const OPTIONS = [[false, "Don't adjust watched percentage"], [true, 'Adjust watched percentage']] as const;
</script>

<SettingsPanel id="rewatching" title="Rewatching" vip>
  {#snippet extra()}
    <SettingsPanelLink href="https://forums.trakt.tv/t/rewatching-tv-shows/19094" text="More Info" external />
  {/snippet}
  <SettingsSelect id="browsing-rewatching-adjust-percentage" label="Watched Percentage"
    bind:value={draft.rewatchingAdjustPercentage} options={OPTIONS}>
    {#snippet help()}Globally adjust the watched percentage for shows and seasons you're rewatching.{/snippet}
  </SettingsSelect>
</SettingsPanel>

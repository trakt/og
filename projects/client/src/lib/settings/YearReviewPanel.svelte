<script lang="ts">
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
import SettingsSubheading from '$lib/components/settings/SettingsSubheading.svelte';
import SettingsPanelLink from '$lib/components/settings/SettingsPanelLink.svelte';
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import type { PanelSettings } from '$lib/settings/PanelSettings';
let { panels = $bindable(), vip }: { panels: PanelSettings; vip: boolean } = $props();
</script>
<SettingsPanel id="yir" title="Year in Review" instructions>
  {#snippet extra()}<SettingsPanelLink href="https://forums.trakt.tv/t/year-in-review/19085" text="More Info" external /><VipLabel badge={{ kind: 'vip', tag: null, years: null }} />{/snippet}
  <SettingsSubheading>Most Watched Sorting</SettingsSubheading>
  <SettingsSelect id="yir-shows" label="Shows" bind:value={panels.yir.shows_most_played} disabled={!vip} options={[["played", "Play Count"], ["watched", "Time Watched"]]} />
  <SettingsSelect id="yir-movies" label="Movies" bind:value={panels.yir.movies_most_played} disabled={!vip} options={[["watched", "Time Watched"], ["played", "Play Count"]]} />
</SettingsPanel>

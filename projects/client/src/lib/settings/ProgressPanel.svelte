<script lang="ts">
import { resolve } from '$app/paths';
import SettingsPanelLink from '$lib/components/settings/SettingsPanelLink.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
import SettingsCheck from '$lib/components/settings/SettingsCheck.svelte';
import type { PanelSettings } from '$lib/settings/PanelSettings';
import { settingOptions } from '$lib/settings/settingOptions';
let { panels = $bindable(), type, slug }: { panels: PanelSettings; type: 'watched' | 'collected'; slug: string } =
  $props();
const title = $derived(type === 'watched' ? 'Watched Progress' : 'Library Progress');
</script>
<SettingsPanel id={type === 'watched' ? 'progress' : 'library-progress'} {title}>
  {#snippet extra()}<SettingsPanelLink href={resolve('/users/[id]/progress/[[type=progressType]]/[...sort]', { id: slug, type: type === 'watched' ? 'watched' : 'library', sort: '' })} text="View {title}" />{/snippet}
  <SettingsSelect id="{type}-use-last" label="Calculate Up Next Using" bind:value={panels.progress[type].use_last_activity} options={[[false, 'Last episode aired'], [true, type === 'watched' ? 'Last episode watched' : 'Last episode added to library']]} />
  <SettingsSelect id="{type}-sort" label="Default Sorting" bind:value={panels.progress[type].sort} bind:how={panels.progress[type].sort_how} options={settingOptions.progress.map(([key, label]) => [key, key === 'added' && type === 'collected' ? 'Added Date' : label] as const)} />
  <SettingsSelect id="{type}-bars" label="Progress Bars" bind:value={panels.progress[type].simple_progress} options={settingOptions.bars} />
  <SettingsSelect id="{type}-refresh" label="Auto Refresh" bind:value={panels.progress[type].refresh} options={settingOptions.progressRefresh}>
    {#snippet help()}Choose what happens after you <b>{type === 'watched' ? 'watch' : 'collect'}</b> the next episode.{/snippet}
  </SettingsSelect>
  <SettingsCheck id="{type}-grid" label="Grid View" bind:checked={panels.progress[type].grid_view} />
  <SettingsCheck id="{type}-watchlisted" label="Include Watchlisted" bind:checked={panels.progress[type].include_watchlisted} />
  {#if type === 'watched'}
    <SettingsCheck id="watched-library" label="Include Library" bind:checked={panels.progress.watched.include_collected} />
  {:else}
    <SettingsCheck id="collected-watched" label="Include Watched" bind:checked={panels.progress.collected.include_watched} />
  {/if}
  <SettingsCheck id="{type}-specials" label="Include Specials" bind:checked={panels.progress[type].include_specials} />
</SettingsPanel>

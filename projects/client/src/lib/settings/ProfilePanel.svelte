<script lang="ts">
import { resolve } from '$app/paths';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
import SettingsSubheading from '$lib/components/settings/SettingsSubheading.svelte';
import SettingsPanelLink from '$lib/components/settings/SettingsPanelLink.svelte';
import type { PanelSettings } from '$lib/settings/PanelSettings';
import { settingOptions } from '$lib/settings/settingOptions';
let { panels = $bindable(), slug }: { panels: PanelSettings; slug: string } = $props();
</script>
<SettingsPanel id="profile" title="Profile" instructions>
  {#snippet extra()}<SettingsPanelLink href={resolve('/users/[id]', { id: slug })} text="View Profile" />{/snippet}
  <SettingsSubheading>Favorites</SettingsSubheading>
  <SettingsSelect id="favorites-sort" label="Sorting" bind:value={panels.profile.favorites.sort_by} bind:how={panels.profile.favorites.sort_how} options={settingOptions.favorites} />
  <SettingsSubheading middle>Most Watched Shows</SettingsSubheading>
  <SettingsSelect id="profile-shows-sort" label="Sorting" bind:value={panels.profile.most_watched_shows.sort_by} options={settingOptions.shows} />
  <SettingsSelect id="profile-shows-tab" label="Default Tab" bind:value={panels.profile.most_watched_shows.tab} options={settingOptions.tabs} />
  <SettingsSubheading middle>Most Watched Movies</SettingsSubheading>
  <SettingsSelect id="profile-movies-sort" label="Sorting" bind:value={panels.profile.most_watched_movies.sort_by} options={settingOptions.movies} />
  <SettingsSelect id="profile-movies-tab" label="Default Tab" bind:value={panels.profile.most_watched_movies.tab} options={settingOptions.tabs} />
</SettingsPanel>

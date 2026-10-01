<script lang="ts">
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
import SettingsCheck from '$lib/components/settings/SettingsCheck.svelte';
import SettingsPanelLink from '$lib/components/settings/SettingsPanelLink.svelte';
import type { PanelSettings } from '$lib/settings/PanelSettings';
import { settingOptions } from '$lib/settings/settingOptions';
let { panels = $bindable(), vip, grandfathered }: { panels: PanelSettings; vip: boolean; grandfathered: boolean } =
  $props();
</script>
<SettingsPanel id="calendars" title="Calendars">
  {#snippet extra()}<SettingsPanelLink href="https://forums.trakt.tv/t/trakt-calendars/19099" text="More Info" external />{/snippet}
  <SettingsSelect id="calendar-period" label="Time Period" bind:value={panels.calendar.period} options={[["week", "Weekly"], ["month", "Monthly"]]} />
  <SettingsSelect id="calendar-start" label="Start Day" bind:value={panels.calendar.start_day} options={settingOptions.days} />
  <SettingsSelect id="calendar-layout" label="Layout" bind:value={panels.calendar.layout} options={[["list", "List"], ["grid", "Grid"]]} />
  <SettingsSelect id="calendar-image" label="Image Type" bind:value={panels.calendar.image_type} disabled={!grandfathered} vip={!grandfathered} options={[["logo", "Logo"], ["screenshot", "Screenshot"], ["fanart", "Fanart"], ["thumb", "Thumb"], ["banner", "Banner"], ["poster", "Poster"], ["none", "None"]]} />
  <SettingsCheck id="calendar-specials" label="Hide Specials" bind:checked={panels.calendar.hide_specials}>
    {#snippet help()}Hide specials on the website and feeds.{/snippet}
  </SettingsCheck>
  <SettingsCheck id="calendar-autoscroll" label="Auto Scroll" bind:checked={panels.calendar.autoscroll} disabled={!vip} vip>
    {#snippet help()}Automatically scroll your calendar to today's date.{/snippet}
  </SettingsCheck>
</SettingsPanel>

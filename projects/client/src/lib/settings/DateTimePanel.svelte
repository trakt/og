<!--
  The Date & Time panel: OG's API zone list, date order, 12 or 24 hours, and the week's first day. A stored
  zone API has no name for stays in the list under its IANA name, so saving leaves it alone.
-->
<script lang="ts">
import SettingsField from '$lib/components/settings/SettingsField.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import { railsTimeZones } from './railsTimeZones';
import type { SettingsDraft } from './SettingsDraft';

let { draft = $bindable() }: { draft: SettingsDraft } = $props();

const DATE_FORMATS = [
  ['mdy', 'Month Day Year'],
  ['dmy', 'Day Month Year'],
  ['ymd', 'Year Month Day'],
  ['ydm', 'Year Day Month'],
] as const;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const stored = draft.timeZone;
const unnamed = railsTimeZones.some((zone) => zone.name === stored) ? [] : [{ label: stored, name: stored }];
const zones = [...unnamed, ...railsTimeZones];
</script>

<SettingsPanel id="datetime" title="Date & Time">
  <SettingsField label="Time Zone" id="account-timezone">
    <select id="account-timezone" required bind:value={draft.timeZone}>
      {#each zones as zone (zone.name)}<option value={zone.name}>{zone.label}</option>{/each}
    </select>
  </SettingsField>
  <SettingsField label="Date Format" id="account-date-format">
    <select id="account-date-format" bind:value={draft.dateFormat}>
      {#each DATE_FORMATS as [value, label] (value)}<option {value}>{label}</option>{/each}
    </select>
  </SettingsField>
  <SettingsField label="Time Format" id="account-time-24hr">
    <select id="account-time-24hr" bind:value={draft.time24hr}>
      <option value={false}>12 Hour</option>
      <option value={true}>24 Hour</option>
    </select>
  </SettingsField>
  <SettingsField label="Week Start Day" id="browsing-week-start-day">
    <select id="browsing-week-start-day" bind:value={draft.weekStartDay}>
      {#each WEEKDAYS as day, index (day)}<option value={String(index)}>{day}</option>{/each}
    </select>
  </SettingsField>
</SettingsPanel>

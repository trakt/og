<!-- The settings checkbox row, including the VIP pill at its right edge and inline helper copy. -->
<script lang="ts">
import type { Snippet } from 'svelte';
import SettingsField from '$lib/components/settings/SettingsField.svelte';
import VipLabel from '$lib/components/labels/VipLabel.svelte';

let { id, label, checked = $bindable(), help, disabled = false, vip = false }: {
  id: string;
  label: string;
  checked: boolean;
  help?: Snippet;
  disabled?: boolean;
  vip?: boolean;
} = $props();
</script>

<SettingsField {id} {label} {help} check>
  {#if vip}<span class="vip"><VipLabel badge={{ kind: 'vip', tag: null, years: null }} small /></span>{/if}
  <input {id} type="checkbox" bind:checked {disabled} aria-describedby={help ? `${id}-help` : undefined} />
</SettingsField>
<style>
.vip {
  float: inline-end;
  margin-block-start: var(--settings-field-vip-top);
}
</style>

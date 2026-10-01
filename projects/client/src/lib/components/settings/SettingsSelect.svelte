<!-- A labeled settings select, with OG's adjacent direction control and optional help/VIP label. -->
<script lang="ts" generics="T extends string | boolean">
import type { Snippet } from 'svelte';
import SettingsField from '$lib/components/settings/SettingsField.svelte';
import VipLabel from '$lib/components/labels/VipLabel.svelte';

let { id, label, value = $bindable(), options, how = $bindable(), help, disabled = false, vip = false }: {
  id: string;
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  how?: 'asc' | 'desc';
  help?: Snippet;
  disabled?: boolean;
  vip?: boolean;
} = $props();
</script>

<SettingsField {id} {label} {help}>
  <div class={['selects', { direction: how !== undefined, vip }]}>
    <select {id} {disabled} bind:value aria-describedby={help ? `${id}-help` : undefined}>
      {#each options as [key, text] (key)}<option value={key}>{text}</option>{/each}
    </select>
    {#if how !== undefined}
      <select class="inline" aria-label="{label} direction" {disabled} bind:value={how}>
        <option value="asc">↓</option><option value="desc">↑</option>
      </select>
    {/if}
    {#if vip}<VipLabel badge={{ kind: 'vip', tag: null, years: null }} small />{/if}
  </div>
</SettingsField>

<style>
.selects.direction {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--settings-direction-width);
  gap: var(--settings-direction-gap);
}
.selects.vip {
  display: flex;
  align-items: center;
  & select {
    flex: 1;
    min-inline-size: 0;
  }
  & :global(.label-vip) {
    flex-shrink: 0;
  }
}
</style>

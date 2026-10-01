<!--
  OG's pill tabs (`.pill-tab-links .tab-links`): small rounded pills over a panel, the active one red. An optional
  count sits in a badge inside the pill. The summary pages use them for comments, lists and cast.
  An ARIA tablist: arrow keys, Home and End move between tabs and select them, Tab goes on into the panel.
    <PillTabs label="Comments" tabs={[{ id: 'recent', label: 'Recent' }]} bind:selected>
      {#snippet panel(id)}...{/snippet}
    </PillTabs>
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import { nextTab } from './nextTab.ts';

interface Tab {
  readonly id: string;
  readonly label: string;
  readonly count?: string | number;
}

interface Props {
  tabs: readonly Tab[];
  /** Names the tablist for screen readers, usually the heading the tabs sit under. */
  label: string;
  selected?: string;
  panel: Snippet<[string]>;
}

let { tabs, label, selected = $bindable(tabs[0]?.id), panel }: Props = $props();
const id = $props.id();

function onkeydown(event: KeyboardEvent) {
  const target = nextTab(tabs.map((tab) => tab.id), selected, event.key);
  if (target === undefined) return;

  event.preventDefault();
  selected = target;
  document.getElementById(`${id}-tab-${target}`)?.focus();
}
</script>

<div class="tabs" role="tablist" aria-label={label}>
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      role="tab"
      id="{id}-tab-{tab.id}"
      aria-controls="{id}-panel"
      aria-selected={tab.id === selected}
      tabindex={tab.id === selected ? 0 : -1}
      onclick={() => (selected = tab.id)}
      {onkeydown}
    >
      {tab.label}
      {#if tab.count !== undefined}<span class="count">{tab.count}</span>{/if}
    </button>
  {/each}
</div>
{#if selected !== undefined}
  <div id="{id}-panel" role="tabpanel" aria-labelledby="{id}-tab-{selected}" tabindex="0">
    {@render panel(selected)}
  </div>
{/if}

<style>
.tabs {
  margin-block-start: -2px;
}

button {
  display: inline-block;
  min-block-size: 0;
  margin: var(--space-sm-block) var(--tab-gap) 0 0;
  padding: var(--tab-padding);
  border: 0;
  border-radius: var(--radius-tab);
  background-color: var(--color-tab-bg);
  color: var(--color-tab-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-tab);
  font-weight: var(--font-weight-headings-light);
  line-height: 1;
  transition: all 0.5s;

  &:hover {
    background-color: var(--color-tab-bg-hover);
  }

  &[aria-selected='true'] {
    background-color: var(--brand-primary);
    color: var(--color-text-inverse);

    &:hover {
      background-color: var(--brand-primary-darken);
    }
  }
}

.count {
  display: inline-block;
  margin: -1px -4px -1px 3px;
  padding: 1px 4px;
  border: 1px solid var(--color-count-bg);
  border-radius: var(--radius-tab);
  background-color: var(--color-count-bg);
  color: var(--color-text-inverse);
  font-size: var(--font-size-count);
  font-weight: var(--font-weight-headings-heavy);
  vertical-align: top;
  transition: all 0.5s;

  button:hover & {
    border-color: var(--color-count-bg-hover);
    background-color: var(--color-count-bg-hover);
  }

  [aria-selected='true'] &,
  [aria-selected='true']:hover & {
    border-color: var(--color-text-inverse);
    background-color: var(--color-text-inverse);
    color: var(--brand-primary);
  }
}
</style>

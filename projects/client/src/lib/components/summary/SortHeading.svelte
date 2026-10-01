<!--
  A summary section's h2 with a bold count ("3 Seasons", "24 Episodes") and, on the right, OG's sort dropdown plus the
  direction toggle. `by` and `flipped` are bindable.
-->
<script lang="ts" generics="By extends string">
import type { Snippet } from 'svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import SortDirection from '$lib/components/dropdown/SortDirection.svelte';

interface Props {
  id: string;
  count: number;
  /** The singular noun after the count; the heading adds the "s". */
  noun: string;
  sorts: readonly { readonly by: By; readonly name: string }[];
  by: By;
  flipped: boolean;
  controls?: Snippet;
  loading?: boolean;
}

let { id, count, noun, sorts, by = $bindable(), flipped = $bindable(), controls, loading = false }: Props = $props();
const sortName = $derived(sorts.find((sort) => sort.by === by)?.name);
</script>

<div class="heading" aria-busy={loading}>
  <h2 {id}><strong>{count.toLocaleString('en-US')}</strong> {count === 1 ? noun : `${noun}s`}</h2>
  <div class="sort">
    <Dropdown>
      {#snippet trigger()}{sortName}{/snippet}
      <ul>
        {#each sorts as sort (sort.by)}
          <li>
            <button type="button" aria-current={sort.by === by} onclick={() => (by = sort.by)}>{sort.name}</button>
          </li>
        {/each}
      </ul>
    </Dropdown>
    <span class="loading" role="status">{loading ? 'Loading stats…' : ''}</span>
    <SortDirection bind:flipped />
    {@render controls?.()}
  </div>
</div>

<style>
.loading {
  font-size: var(--font-size-small);
  color: var(--color-summary-label);
}
.heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-block-start: var(--gutter);

  & h2 {
    margin: 0;
  }

  & strong {
    font-weight: var(--font-weight-headings);
  }
}

.sort {
  display: flex;
  align-items: center;
  margin-block-start: -7px;
}
</style>

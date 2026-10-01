<!--
  Comma-separated names in an AdditionalStat. With `collapse`, only the first shows, then a "+ N more" button that
  reveals the rest in place, like OG's writers and studios rows.
-->
<script lang="ts">
import type { NamedLink } from './NamedLink.ts';

interface Props {
  names: readonly NamedLink[];
  collapse?: boolean;
}

const { names, collapse = false }: Props = $props();

let expanded = $state(false);
const shown = $derived(collapse && !expanded ? names.slice(0, 1) : names);
</script>

<!-- Person pages og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<!-- One line, so no stray space lands before a comma. -->
{#each shown as { name, href, note }, i (i)}{i > 0 ? ', ' : ''}{#if href}<a
  {href}>{name}</a>{:else}{name}{/if}{#if note}<span>{` (${note})`}</span>{/if}{/each}
{#if collapse && !expanded && names.length > 1}
  <button type="button" class="more" onclick={() => (expanded = true)}>+ {names.length - 1} more</button>
{/if}

<style>
.more {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-link);
  font: inherit;
  cursor: pointer;

  &:is(:hover, :focus-visible) {
    color: var(--color-link-hover);
    text-decoration: underline;
  }
}
</style>

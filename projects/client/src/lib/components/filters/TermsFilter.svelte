<!--
  OG's title filter : a search icon that opens a dialog
  asking for a search term, red while one is applied. `t` opens it too. It was a VIP feature, so everyone else
  gets a link to the VIP filtering page instead.
    <TermsFilter bind:terms vip={user?.isVip ?? false} />
-->
<script lang="ts">
import Dialog from '$lib/components/dialog/Dialog.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import search from '$lib/icons/thin/magnifying-glass.svg?raw';

interface Props {
  terms: string;
  vip: boolean;
}

let { terms = $bindable(), vip }: Props = $props();
let open = $state(false);
let draft = $state('');

function show() {
  draft = terms;
  open = true;
}

function apply(event: SubmitEvent) {
  event.preventDefault();
  terms = draft.trim();
  open = false;
}

function onkeydown(event: KeyboardEvent) {
  if (event.key !== 't' || event.metaKey || event.ctrlKey || event.altKey || !vip || open) return;
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) {
    return;
  }
  event.preventDefault();
  show();
}
</script>

<svelte:window {onkeydown} />

<!-- The VIP page is an OG route og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<Tooltip text="Filter by Title">
  {#snippet trigger(tooltip)}
    {#if vip}
      <button type="button" class={['launcher', { active: terms }]} aria-label="Filter by title" onclick={show}
        {...tooltip}>
        <Icon svg={search} /><span class="caret"></span>
      </button>
    {:else}
      <a class="launcher" href="/vip/filtering" aria-label="Filter by title" {...tooltip}>
        <Icon svg={search} /><span class="caret"></span>
      </a>
    {/if}
  {/snippet}
</Tooltip>

{#if vip}
  <Dialog bind:open title="Filter by title">
  <form class="terms-form" onsubmit={apply}>
    <p class="lead">Only display items with a <strong>title</strong><br />matching your search term.</p>
    <label>
      <span class="label">Search Term</span>
      <input type="search" placeholder="Type a search term..." bind:value={draft} />
    </label>
    <button type="submit" class="submit">Apply Filter</button>
  </form>
</Dialog>
{/if}

<style>
.launcher {
  display: inline-flex;
  align-items: center;
  min-block-size: 0;
  margin-inline: 0 5px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: var(--font-size-filter-terms);
  line-height: 1;
  vertical-align: middle;
  text-decoration: none;
  transition: color 0.5s;

  &.active {
    color: var(--brand-primary);
  }

  &:is(:hover, :focus-visible) {
    color: inherit;
  }
}

.caret {
  margin: 1px 0 0 2px;
  border-block-start: 4px solid;
  border-inline: 4px solid transparent;
}

.terms-form {
  display: grid;
  gap: 10px;
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  font-weight: normal;
  text-align: center;
}

.lead {
  margin: 0 0 10px;
  font-family: var(--font-headings);
  font-size: var(--font-size-large);
}

label {
  display: grid;
  gap: 5px;
}

.label {
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.submit {
  border-color: var(--color-btn-primary-border);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}
</style>

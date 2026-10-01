<!--
  The Account Limits table: Feature with its
  helper line, Free Plan, the viewer's own limits (Earned Limits for a VIP) and VIP Limits. The viewer's column is
  highlighted. OG spaced the last two columns with empty cells; here a transparent border does it, so the table has no
  empty cells, and each row draws its rule under the cells so it crosses the spacers like OG's did. A non-VIP gets "Sign Up ➟" under the VIP column. It scrolls sideways on phones.
-->
<script lang="ts">
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import type { AccountLimitRow } from './toAccountLimits';

const { rows, vip }: { rows: readonly AccountLimitRow[]; vip: boolean } = $props();
const number = new Intl.NumberFormat('en-US');
</script>

<!-- VIP pages aren't built yet; OG's link is `/vip`. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable tables need focus for keyboard scrolling.) -->
<div class="limits" role="region" aria-label="Account limits" tabindex="0">
  <table>
    <thead>
      <tr>
        <th scope="col">Feature</th>
        <th scope="col">Free Plan</th>
        <th scope="col" class={['spaced', { selected: !vip }]}>{vip ? 'Earned Limits' : 'Your Limits'}</th>
        <th scope="col" class={['spaced', 'vip', { selected: vip }]}>
          <VipLabel badge={{ kind: 'vip', tag: null, years: null }} small />Limits
        </th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.feature)}
        <tr>
          <th scope="row">{row.feature}<span class="helper">{row.helper}</span></th>
          <td>{number.format(row.free)}</td>
          <td class={['spaced', { selected: !vip }]}>{number.format(row.yours)}{#if row.earned}&nbsp; 🥳{/if}</td>
          <td class={['spaced', 'vip', { selected: vip }]}>{number.format(row.vip)}</td>
        </tr>
      {/each}
      {#if !vip}
        <tr>
          <td colspan="3"></td>
          <td class="spaced"><a class="signup" href="/vip">Sign Up ➟</a></td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
.limits {
  margin-block-end: var(--gutter);
  overflow-x: auto;
  border: 1px solid var(--color-data-panel-border);
  background-color: var(--color-data-panel-header-bg);
}

table {
  inline-size: 100%;
  border-collapse: separate;
  border-spacing: 0;
  color: var(--color-data-panel-heading);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
}

th,
td {
  padding: var(--limits-cell-padding);
  white-space: nowrap;
  text-align: start;
  vertical-align: middle;

  &:first-child {
    inline-size: 100%;
  }

  &:not(:first-child) {
    padding-inline: var(--limits-column-padding);
  }
}

thead th {
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;

  &.selected {
    background-color: var(--brand-primary);
    color: var(--color-text-inverse);
  }
}

tbody {
  & tr {
    background-color: var(--color-data-panel-bg);

    &:hover {
      background-color: var(--color-data-panel-hover);
    }
  }

  /* The row draws its rule through the cells' transparent top borders, so it runs unbroken across the spacers. */
  & tr:not(:first-child) {
    background-image: linear-gradient(var(--color-data-panel-row-border) 0 0);
    background-size: 100% 1px;
    background-repeat: no-repeat;

    & > * {
      border-block-start: 1px solid transparent;
      background-clip: padding-box;
    }
  }

  & th {
    font-weight: inherit;
  }

  & .selected {
    background-color: var(--color-limits-selected);
    font-weight: var(--font-weight-headings-heavy);
  }

  & .vip.selected {
    background-color: var(--color-limits-selected-vip);
  }
}

/* OG's `td.spacer` before the viewer's and the VIP columns. */
.spaced {
  border-inline-start: var(--limits-spacer) solid transparent;
  background-clip: padding-box;
}

.helper {
  display: block;
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
  font-style: italic;
}

/* The VIP label turns white on the highlighted VIP heading, with the mark and text in red. */
.vip :global(.label-vip) {
  margin: var(--limits-label-margin);
}

.vip.selected :global(.label-vip) {
  background-color: var(--color-text-inverse);
  color: var(--brand-primary);
}

.signup {
  display: inline-block;
  margin: var(--limits-signup-margin);
  padding: var(--limits-signup-padding);
  border-radius: var(--radius-limits-signup);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-size: var(--font-size-settings-alert);
  font-weight: var(--font-weight-headings-heavy);
  text-decoration: none;
  text-transform: uppercase;

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}
</style>

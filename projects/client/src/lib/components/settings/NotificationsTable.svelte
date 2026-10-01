<!--
  OG's notification table: a panel whose heading row has the group's
  name and one icon per channel, then a row per notification with a checkbox per channel. Clicking a channel's icon
  checks the whole column, or unchecks it when it's all checked already ; og makes the icon a
  button so the keyboard can do it too. A read-only column shows its values with disabled checkboxes. `label` renders
  a row's label when it needs markup (OG's bold `@username`).
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import type { Snippet } from 'svelte';
import { columnToggle } from './columnToggle';
import type { NotificationsColumn } from './NotificationsColumn';
import type { NotificationsRow } from './NotificationsRow';

interface Props {
  title: string;
  columns: readonly NotificationsColumn[];
  rows: readonly NotificationsRow[];
  checked: (row: string, column: string) => boolean;
  onchange: (row: string, column: string, checked: boolean) => void;
  label?: Snippet<[NotificationsRow]>;
}

const { title, columns, rows, checked, onchange, label }: Props = $props();

function toggle(column: string) {
  const value = columnToggle(rows.map((row) => checked(row.id, column)));
  for (const row of rows) onchange(row.id, column, value);
}
</script>

<div class="panel">
  <table>
    <thead>
      <tr>
        <th scope="col">{title}</th>
        {#each columns as column (column.id)}
          <th scope="col" class="service" title={column.title}>
            {#if column.readonly}
              <Icon svg={column.icon} label={column.title} />
            {:else}
              <button type="button" aria-label="Check or uncheck every {column.title} notification in {title}" onclick={() => toggle(column.id)}>
                <Icon svg={column.icon} />
              </button>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.id)}
        <tr>
          <th scope="row">
            {#if label}{@render label(row)}{:else}{row.label}{/if}
            {#if row.helper}<span class="helper">{row.helper}</span>{/if}
          </th>
          {#each columns as column (column.id)}
            <td class="service">
              <input
                type="checkbox"
                aria-label="{row.label}: {column.title}"
                checked={checked(row.id, column.id)}
                disabled={column.readonly}
                onchange={(event) => onchange(row.id, column.id, event.currentTarget.checked)}
              />
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
.panel {
  margin-block-end: var(--gutter);
  border: 1px solid var(--color-data-panel-border);
  background-color: var(--color-data-panel-bg);
}

table {
  inline-size: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: var(--table-cell-padding);
  text-align: start;
  vertical-align: top;
}

thead th {
  border-block-end: 1px solid var(--color-data-panel-border);
  background-color: var(--color-data-panel-header-bg);
  color: var(--color-data-panel-heading);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
  vertical-align: bottom;
}

tbody {
  & tr:hover {
    background-color: var(--color-data-panel-hover);
  }

  & tr + tr > * {
    border-block-start: 1px solid var(--color-data-panel-row-border);
  }

  & th {
    font-weight: normal;
  }
}

.service {
  inline-size: var(--notifications-service-width);
  padding-inline: 0;
  font-size: var(--font-size-notifications-service);
  text-align: center;
  white-space: nowrap;
}

thead .service {
  cursor: cell;

  & :global(.icon) {
    vertical-align: middle;
  }
}

button {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: inherit;
}

.helper {
  display: block;
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
  font-style: italic;
}

input {
  display: block;
  margin: var(--notifications-checkbox-margin);
}
</style>

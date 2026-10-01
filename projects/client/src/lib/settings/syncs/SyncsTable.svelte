<!--
  OG's syncs table: Date, Service, then History, Library, Ratings and Watchlist
  with what the sync added, and Undo. Paused and skipped counts link to the sync's details. An undone row fades and
  says "Undone". Undo asks first, then removes the sync's items through the API and refreshes the poster overlay.
  The added counts are plain text: OG linked them to history, library, ratings and watchlist filtered by the sync,
  which og's pages don't support.
-->
<script lang="ts">
import SettingsTable from '$lib/components/table/SettingsTable.svelte';
import { resolve } from '$app/paths';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { login } from '$lib/auth/login';
import { userManager } from '$lib/auth/userManager';
import { toast } from '$lib/components/toast/toast.svelte';
import ServiceTile from '$lib/components/watchnow/ServiceTile.svelte';
import Icon from '$lib/icons/Icon.svelte';
import bookBookmark from '$lib/icons/light/book-bookmark.svg?raw';
import clock from '$lib/icons/light/clock.svg?raw';
import heart from '$lib/icons/light/heart.svg?raw';
import list from '$lib/icons/light/list.svg?raw';
import backward from '$lib/icons/solid/backward.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import { SvelteSet } from 'svelte/reactivity';
import type { SyncRow } from './toSyncRow';
import UndoSyncDialog from './UndoSyncDialog.svelte';
import { undoSync } from './undoSync';

interface Props {
  rows: readonly SyncRow[];
  /** Undoes a sync. The demo route passes one that doesn't touch the API. */
  undo?: (id: number) => Promise<boolean>;
}

async function browserUndo(id: number) {
  if (!(await userManager().getUser())?.access_token) {
    void login();
    return false;
  }
  const fetch = authenticatedFetch({ manager: userManager() });
  const done = await undoSync({ id, notify: toast, request: (path, init) => rawApiFetch({ fetch, path, init }) });
  if (done) void overlay.refresh();
  return done;
}

const { rows, undo = browserUndo }: Props = $props();

const COLUMNS = [
  { section: 'history', label: 'History', icon: clock },
  { section: 'library', label: 'Library', icon: bookBookmark },
  { section: 'ratings', label: 'Ratings', icon: heart },
  { section: 'watchlist', label: 'Watchlist', icon: list },
] as const;

const undone = new SvelteSet<number>();
let asking = $state<SyncRow | null>(null);
let open = $state(false);
let busy = $state(false);

function ask(row: SyncRow) {
  asking = row;
  open = true;
}

async function confirm() {
  if (!asking || busy) return;
  busy = true;
  const id = asking.id;
  try {
    if (await undo(id)) undone.add(id);
  } finally {
    busy = false;
    open = false;
  }
}
</script>

<SettingsTable label="Data syncs">
  <table>
    <thead>
      <tr>
        <th scope="col" class="date">Date</th>
        <th scope="col" class="service">Service</th>
        {#each COLUMNS as column (column.section)}
          <th scope="col"><span class="th-icon"><Icon svg={column.icon} fixedWidth /></span>{column.label}</th>
        {/each}
        <th scope="col"><span class="visually-hidden">Undo</span></th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.id)}
        {@const isUndone = row.undone || undone.has(row.id)}
        <tr class={{ undone: isUndone }}>
          <td class="date">{row.date}</td>
          <td class="service">
            {#if row.service.kind === 'tile'}
              <ServiceTile link={{ ...row.service.source, slug: row.service.slug, href: '' }} />
            {:else}
              {row.service.name}
            {/if}
          </td>
          {#each row.columns as column (column.section)}
            <td>
              {#if !isUndone}
                {#each column.added as line (line)}<span class="helper">{line}</span>{/each}
              {/if}
              {#each column.details as line (line)}
                <a class="helper details" href={resolve('/settings/syncs/[id=syncId]', { id: String(row.id) })}>{line}</a>
              {/each}
            </td>
          {/each}
          <td>
            <div class="action">
              {#if isUndone}
                <span class="button undone-label">Undone</span>
              {:else}
                <button type="button" class="button" onclick={() => ask(row)}>
                  <span class="undo-icon"><Icon svg={backward} fixedWidth /></span>Undo
                </button>
              {/if}
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</SettingsTable>

<UndoSyncDialog bind:open removes={asking?.removes ?? null} {busy} onconfirm={confirm} />

<style>
.th-icon {
  margin-inline-end: var(--space-xs-inline);
}

.date {
  inline-size: var(--syncs-date-width);
  white-space: nowrap;
}

.service {
  inline-size: var(--syncs-service-width);
  --service-width: var(--syncs-tile-width);
  --service-height: var(--syncs-tile-height);
  --service-padding: var(--syncs-tile-padding);

  /* OG's tile sits flush with the cell's padding. */
  & :global(.service) {
    margin-inline-start: calc(-1 * var(--space-xs-inline));
  }
}

.helper {
  display: block;
  color: var(--color-syncs-helper);
  font-size: var(--font-size-syncs-helper);
  font-style: italic;
  white-space: nowrap;
}

.details {
  color: var(--color-syncs-details);

  &:is(:hover, :focus-visible) {
    color: var(--color-link-hover);
  }
}

.action {
  text-align: end;
}

.button {
  display: inline-block;
  min-block-size: 0;
  padding: var(--syncs-undo-padding);
  border: 1px solid var(--color-btn-primary-border);
  border-radius: var(--radius-syncs-undo);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-syncs-undo);
  font-weight: var(--font-weight-headings-heavy);
  line-height: var(--line-height-base);
  text-transform: uppercase;
  white-space: nowrap;

  &:is(button):is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}

.visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.undo-icon {
  margin-inline-end: var(--syncs-undo-icon-gap);
}

tr.undone {
  opacity: var(--syncs-undone-opacity);

  .undone-label {
    border-color: var(--color-sync-undone-border);
    background-color: var(--color-sync-undone);
  }
}
</style>

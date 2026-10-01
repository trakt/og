<script lang="ts">
import { page } from '$app/state';
import type { Snippet } from 'svelte';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { login } from '$lib/auth/login';
import { userManager } from '$lib/auth/userManager';
import NotesDialog from '$lib/components/notes/NotesDialog.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import type { FavoriteTarget } from '$lib/favorites/FavoriteTarget';
import { loadFavoriteTarget } from '$lib/favorites/loadFavoriteTarget';
import { saveFavoriteNote } from '$lib/favorites/saveFavoriteNote';
import { toggleFavorite } from '$lib/favorites/toggleFavorite';
import { overlay } from '$lib/overlay/overlay';
import { formatDate } from '$lib/utils/formatDate';

interface Props {
  target: FavoriteTarget;
  trigger: Snippet<[{ selected: boolean; date?: string; busy: boolean; toggle: () => void }]>;
}
const { target, trigger }: Props = $props();
let busy = $state(false);
let saving = $state(false);
let open = $state(false);
let draft = $state('');
let noteId = $state<number | null>(null);
let promptTarget = $state<FavoriteTarget | null>(null);
const membership = $derived(overlay.state(target.type, target.id));
const date = $derived(
  membership.favoritedAt ? formatDate(membership.favoritedAt, { ...page.data.datePreferences, time: true }) : undefined,
);

const request = (method: 'POST' | 'PUT') => (path: string, body?: unknown) =>
  rawApiFetch({
    fetch: authenticatedFetch({ manager: userManager() }),
    path,
    init: body === undefined ? undefined : {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  });

async function toggle() {
  if (busy || saving) return;
  if (!await userManager().getUser()) {
    await login();
    return;
  }
  busy = true;
  try {
    const note = await toggleFavorite({
      target,
      remove: Boolean(membership.favorited),
      overlay,
      request: request('POST'),
      notify: toast,
    });
    if (note) {
      promptTarget = await loadFavoriteTarget(target);
      noteId = note.id;
      draft = note.notes;
      open = true;
    }
  } finally {
    busy = false;
  }
}

async function save(notes: string) {
  if (saving || noteId === null) return;
  saving = true;
  try {
    if (await saveFavoriteNote({ id: noteId, notes, request: request('PUT'), notify: toast })) open = false;
  } finally {
    saving = false;
  }
}
</script>

{@render trigger({ selected: Boolean(membership.favorited), date, busy, toggle })}
{#if promptTarget}
  <NotesDialog bind:open bind:draft item={promptTarget} favorite busy={saving}
  onsave={save} />
{/if}

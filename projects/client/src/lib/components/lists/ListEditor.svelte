<script lang="ts">
import { page } from '$app/state';
import { tick } from 'svelte';
import { invalidateAll } from '$app/navigation';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import Dialog from '$lib/components/dialog/Dialog.svelte';
import NewListDialog from '$lib/components/lists/NewListDialog.svelte';
import { loadListEditor } from '$lib/components/lists/loadListEditor';
import { saveList } from '$lib/components/lists/saveList';
import { ListWriteError } from '$lib/components/lists/ListWriteError';
import type { ListDraft } from '$lib/components/lists/ListDraft';
import { listCatalog } from '$lib/components/lists/listCatalog.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import { overlay } from '$lib/overlay/overlay';
interface Props {
  id: number | null;
  onclose: () => void;
  onsaved?: (slug: string) => Promise<void>;
}
const { id, onclose, onsaved }: Props = $props();
// The loading dialog is replaced after its reads; keep the original trigger for focus restoration.
const trigger = typeof document === 'undefined' ? undefined : document.activeElement;
function close() {
  open = false;
  onclose();
  void tick().then(() => {
    if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
  });
}
let open = $state(true);
let loaded = $state<Awaited<ReturnType<typeof loadListEditor>>>();
let busy = $state(false);
let error = $state('');
let fields = $state<Readonly<Record<string, readonly string[]>>>({});
let serverLimit = $state<number>();
// svelte-ignore state_referenced_locally
let savedId = $state<number | undefined>(id ?? undefined);
const fetch = authenticatedFetch({ manager: userManager() });
const request = (path: string, method: string, body?: unknown) =>
  rawApiFetch({
    fetch,
    path,
    init: {
      method,
      ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    },
  });
const limit = $derived(page.data.settings?.limits?.list?.count);
const max = $derived(
  serverLimit ?? (savedId === undefined && limit !== undefined && (loaded?.count ?? 0) >= limit ? limit : undefined),
);
$effect(() => {
  let active = true;
  loadListEditor({ fetch, id }).then((result) => {
    if (active) loaded = result;
  }).catch(() => {
    if (!active) return;
    toast.error("Doh! We couldn't load the list editor. Please try again.");
    close();
  });
  return () => {
    active = false;
  };
});
async function save(draft: ListDraft) {
  if (busy) return;
  busy = true;
  error = '';
  fields = {};
  if (draft.collaborators.length > 10) {
    fields = { collaborators: ['A list can have at most 10 collaborators.'] };
    busy = false;
    return;
  }
  try {
    const result = await saveList({ request, draft, id: savedId });
    const wasNew = savedId === undefined;
    savedId = result.list.ids.trakt;
    if (wasNew && loaded) loaded = { ...loaded, count: loaded.count + 1 };
    listCatalog.update(page.data.user?.slug ?? '', loaded?.count ?? 0);
    if (result.collaboratorError) {
      fields = { collaborators: [result.collaboratorError] };
      toast.error(result.collaboratorError);
      return;
    }
    toast.success(`You saved ${result.list.name}.`);
    const wasOpen = open;
    open = false;
    if (wasOpen) close();
    void overlay.refresh();
    if (wasOpen && onsaved) await onsaved(result.list.ids.slug ?? String(result.list.ids.trakt));
    else await invalidateAll();
  } catch (cause) {
    if (cause instanceof ListWriteError && cause.status === 420) serverLimit = limit ?? loaded?.count ?? 0;
    else if (cause instanceof ListWriteError && [409, 422].includes(cause.status)) {
      fields = Object.keys(cause.fields).length ? cause.fields : { name: [cause.message] };
    } else error = 'Could not save the list. Please try again.';
    toast.error(error || 'Please check the highlighted list fields.');
  } finally {
    busy = false;
  }
}
</script>
{#if loaded}
  <NewListDialog bind:open initial={loaded.initial} editing={savedId !== undefined} following={loaded.candidates}
  avatar={page.data.user?.avatarUrl} vip={page.data.user?.isVip} {max} {busy} {error} fieldErrors={fields} onsave={save}
  onclose={close} />
{:else}
  <Dialog bind:open title={id === null ? 'Add a list' : 'Update your list'} onclose={close}>
  <p role="status">Loading…</p>
</Dialog>
{/if}

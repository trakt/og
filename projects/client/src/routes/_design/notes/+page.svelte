<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import EpisodeTypeBadge from '$lib/components/media/EpisodeTypeBadge.svelte';
import NoteManage from '$lib/components/notes/NoteManage.svelte';
import NotesDialog from '$lib/components/notes/NotesDialog.svelte';
import NoteCard from '$lib/components/notes/NoteCard.svelte';
import PrivateNotes from '$lib/components/summary/PrivateNotes.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import { noteRowsSchema } from '$lib/users/notes/noteRowsSchema';
import { toNote } from '$lib/users/notes/toNote';

let open = $state(false);
let draft = $state('');
const preferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const item = { type: 'movie', id: 1, slug: 'fight-club-1999', title: 'Fight Club', year: 1999 } as const;
const note = {
  id: 1,
  text: 'Watched this on a flight.\nDeserves a proper rewatch.',
  updatedAt: '2026-09-29T12:00:00Z',
};
const rows = noteRowsSchema.parse([
  {
    type: 'movie',
    movie: { title: 'Fight Club', ids: { trakt: 1 } },
    attached_to: { type: 'movie' },
    note: {
      id: 1,
      notes: 'A spoiler note. Reveal with the keyboard or mouse.',
      privacy: 'public',
      spoiler: true,
      updated_at: '2026-09-29T12:00:00Z',
      user: { username: 'og_tester', name: 'OG Tester', ids: { slug: 'og_tester' }, vip: true, vip_years: 7 },
    },
  },
  {
    type: 'movie',
    movie: { title: 'Fight Club', ids: { trakt: 1 } },
    attached_to: { type: 'rating', rating: 7, rated_at: '2026-09-28T12:00:00Z' },
    note: {
      id: 2,
      notes: 'A long note with paragraphs.\n\n'.repeat(40),
      privacy: 'private',
      updated_at: '2026-09-29T12:00:00Z',
      user: { username: 'og_tester', ids: { slug: 'og_tester' } },
    },
  },
]);
</script>

<svelte:head>
  <title>Notes design system - Trakt</title>
</svelte:head>
<section class="demo">
  <Container>
    <h1>Notes</h1>
  </Container>
  <SectionToolbar>
    {#snippet filters()}Note type filter{/snippet}
    {#snippet summary()}2 notes · Added Date{/snippet}
  </SectionToolbar>
  <Container>
    <h2>Sample note cards</h2>
    <div class="badge-example"><EpisodeTypeBadge kind="series-premiere" label="Series Premiere" /></div>
    {#each rows as row (row.note.id)}
      {@const note = toNote(row, preferences)}
      {#if note}<NoteCard {note}>
        {#snippet manage()}<NoteManage onedit={() => { draft = note.text; open = true; }} ondelete={() => {}} />{/snippet}
      </NoteCard>{/if}
    {/each}
    <h2>Private notes box</h2>
    <p>Under a summary's overview. Clicking the note opens the notes modal, which saves to the API when signed in.</p>
    <PrivateNotes {item} {note} signedIn datePreferences={preferences} />
    <PrivateNotes {item} note={null} signedIn={false} datePreferences={preferences} />
  </Container>
</section>
<NotesDialog bind:open bind:draft {item} onsave={() => open = false} />

<style>
.badge-example {
  position: relative;
  block-size: var(--line-height-computed);
}
.demo {
  padding-block: var(--header-height);
}
</style>

<script lang="ts">
import type { Snippet } from 'svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import NoteCard from '$lib/components/notes/NoteCard.svelte';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { NoteView } from '$lib/users/notes/NoteView';
import type { OverlayState } from '$lib/overlay/createOverlay.svelte';
import { overlay } from '$lib/overlay/overlay';

const { note, datePreferences, manage }: { note: NoteView; datePreferences: DatePreferences; manage?: Snippet } =
  $props();
const state = $derived.by((): OverlayState =>
  note.item.type === 'person' ? {} : overlay.state(note.item.type, note.item.id, note.item.seasonOf)
);
</script>

<!-- Item URLs are mapped from the API's canonical slugs. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="note-row">
  <h2 class="inline-title">{note.item.showTitle ? `${note.item.showTitle}: ` : ''}{note.item.title}</h2>
  <div class="poster">
    <PosterCard
      href={note.item.href}
      title={note.item.title}
      image={note.item.image}
      variant={note.item.variant}
      episodeBadge={note.item.episodeBadge}
      userRating={state.rating}
      icons={note.item.type === 'person' ? undefined : {
        listTarget: { type: note.item.type, id: note.item.id, title: note.item.title },
        fill: quickIconFill({ state, airedEpisodes: note.item.airedEpisodes, datePreferences }),
        rating: note.item.rating,
        watchNow: 'play',
        listLabel: ['movie', 'show'].includes(note.item.type) ? 'Add to watchlist' : 'Add to list',
      }}
    />
    {#if note.item.showTitle && note.item.showHref}
      <a class="show-title" href={note.item.showHref}>{note.item.showTitle}</a>
    {/if}
  </div>
  <div class="content">
    <NoteCard {note} {manage} />
  </div>
</div>

<style>
.note-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 5fr);
  margin-inline: calc(var(--gutter) / -2);
}
.poster,
.content {
  min-inline-size: 0;
  padding-inline: calc(var(--gutter) / 2);
}
.poster {
  margin-block-end: var(--note-row-bottom);
}
.show-title {
  display: block;
  margin-block-start: var(--note-pill-gap);
  color: var(--color-card-subtitle);
  font-family: var(--font-headings);
  font-size: var(--font-size-card-subtitle);
  text-align: center;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}
.inline-title {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (max-width: 767px) {
  .note-row {
    display: block;
  }
  .poster {
    display: none;
  }
  .inline-title {
    position: static;
    inline-size: auto;
    block-size: auto;
    overflow: visible;
    clip-path: none;
    white-space: normal;
    display: block;
    margin: 0;
    padding: var(--note-inline-title-padding);
    background: var(--color-note-inline-title);
    font-size: var(--font-size-note-author);
  }
}
</style>

<script lang="ts">
import type { Snippet } from 'svelte';
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import NoteText from '$lib/components/notes/NoteText.svelte';
import Icon from '$lib/icons/Icon.svelte';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import collection from '$lib/icons/trakt/collection-thick.svg?raw';
import heart from '$lib/icons/solid/heart.svg?raw';
import type { NoteView } from '$lib/users/notes/NoteView';

const { note, manage }: { note: NoteView; manage?: Snippet } = $props();
const activityIcons = { history: check, collection, rating: heart };
</script>

<!-- The API supplies canonical user URLs. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<article class="note-card" aria-label="Note by {note.author.name}">
  <header>
    {#if note.author.href}
      <a class="avatar" href={note.author.href} tabindex="-1" aria-hidden="true"><img src={note.author.avatar} alt="" /></a>
    {:else}
      <span class="avatar"><img src={note.author.avatar} alt="" /></span>
    {/if}
    <div class="byline">
      <h3>
        Note by
        {#if note.author.href}<a href={note.author.href}>{note.author.name}</a>{:else}<strong>{note.author.name}</strong>{/if}
        {#if note.author.vip}<span class="vip"><VipLabel badge={note.author.vip} /></span>{/if}
      </h3>
      <div class="labels">
        {#if note.activity}<span class="pill {note.activity.type}">{note.activity.label}</span>{/if}
        <span class="pill media">{note.item.type}</span>
        <span class="pill">{note.privacy}</span>
        {#if note.spoiler}<span class="pill">Spoilers</span>{/if}
        <time datetime={note.updatedAt}>{note.updatedDate}</time>
      </div>
    </div>
    {@render manage?.()}
  </header>
  <div class="body"><NoteText text={note.text} concealed={note.concealed} /></div>
  {#if note.activity}
    <div class="activity {note.activity.type}">
      <Icon svg={activityIcons[note.activity.type]} />
      {#if note.activity.rating !== null}<b>{note.activity.rating}</b> — {/if}
      {note.activity.date}
    </div>
  {/if}
</article>

<style>
.note-card {
  margin-block-end: var(--note-padding);
  border-radius: var(--radius-note);
  background: var(--color-note-bg);
}
header {
  display: flex;
  align-items: start;
  gap: var(--note-author-gap);
  padding: var(--note-header-padding);
  background: var(--color-note-header);
  min-block-size: var(--note-header-min-height);
}
.avatar {
  flex: 0 0 var(--note-avatar-size);
  margin-block-start: var(--note-avatar-offset);
  margin-inline-start: var(--note-avatar-offset);
  img {
    display: block;
    inline-size: var(--note-avatar-size);
    block-size: var(--note-avatar-size);
    border: var(--note-avatar-border) solid var(--color-note-avatar-border);
    border-radius: 50%;
    object-fit: cover;
  }
}
.byline {
  min-inline-size: 0;
}
h3 {
  margin: var(--note-author-offset) 0 0;
  font-size: var(--font-size-note-author);
  line-height: var(--line-height-headings);
  a {
    color: var(--color-text);
    font-weight: var(--font-weight-headings);
    text-decoration: none;
    &:hover {
      color: var(--color-link);
    }
  }
}
.vip {
  /* OG's compact inline VIP badge in comment headings, rather than the profile's large pill. */
  :global(.label-vip) {
    margin: 0 var(--note-vip-margin);
    padding: 0;
    font-size: var(--font-size-note-pill);
    border-radius: 0;
  }
  :global(.mark) {
    display: none;
  }
  :global(.text) {
    padding: var(--note-pill-padding);
  }
  :global(.tag) {
    margin: 0;
    padding: var(--note-pill-padding);
  }
  :global(.years) {
    color: var(--color-note-vip-star);
    inset-block-start: var(--note-vip-star-top);
    font-size: var(--note-vip-star-size);
    inset-inline-end: var(--note-vip-star-offset);
  }
  :global(.years-text) {
    color: var(--color-text-inverse);
    font-size: var(--font-size-note-pill);
    line-height: var(--note-vip-star-size);
  }
}
.labels {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  column-gap: var(--note-pill-gap);
  row-gap: var(--note-pill-gap);
  padding-block-start: var(--note-labels-top);
  font-size: var(--font-size-note-author);
  line-height: var(--line-height-headings);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
}
.pill {
  padding: var(--note-pill-padding);
  border-radius: var(--radius-note);
  background: var(--color-note-pill);
  color: var(--color-text-inverse);
  font-size: var(--font-size-note-pill);
  line-height: var(--line-height-note-pill);
  text-transform: uppercase;
  &.media {
    background: var(--color-note-media);
  }
  &.history {
    background: var(--color-note-history);
  }
  &.collection {
    background: var(--color-note-collection);
  }
  &.rating {
    background: var(--color-note-rating);
  }
}
time {
  font-size: var(--font-size-note-author);
}
.body {
  padding: var(--note-padding);
}
.activity {
  padding: 0 var(--note-padding) var(--note-padding);
  font-family: var(--font-headings);
  font-size: var(--font-size-note-author);
  text-transform: uppercase;
  &.history {
    color: var(--brand-tertiary);
  }
  &.collection {
    color: var(--brand-quaternary);
  }
  &.rating {
    color: var(--rating-10);
  }
  :global(.icon) {
    margin-inline-end: var(--note-pill-gap);
  }
}
</style>

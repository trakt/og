<!--
  Discover's Recent Comments: the
  15 newest top-level comments, loaded in the browser as the block nears the viewport, like OG's request after the
  page. The titles column lists each one's item; picking a title shows its comment beside it (the first one on load)
  and scrolls the block into view. Both columns sit over the selected item's fanart, which cross-fades in over 0.5s.
  The two dropdowns reload the list. When the read fails the block keeps its heading and dropdowns and says so, instead
  of failing the page.
-->
<script lang="ts">
import CommentCard from '$lib/components/comments/CommentCard.svelte';
import type { CommentViewer } from '$lib/components/comments/CommentViewer';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import type { FormatDateOptions } from '$lib/utils/formatDate';
import type { Attachment } from 'svelte/attachments';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { fetchListFanart } from '../lists/fetchListFanart.ts';
import { nearViewport } from '../utils/nearViewport.ts';
import { fetchRecentComments } from './fetchRecentComments.ts';
import { recentCommentFilters } from './recentCommentFilters.ts';
import type { RecentComment } from './toRecentComment.ts';

type Filters = typeof recentCommentFilters;
type CommentType = keyof Filters['commentTypes'];
type MediaType = keyof Filters['mediaTypes'];

interface Props {
  viewer: CommentViewer;
  dateOptions: Pick<FormatDateOptions, 'order' | 'hour24' | 'timeZone'>;
}

const { viewer, dateOptions }: Props = $props();
const id = $props.id();

let commentType = $state<CommentType>(recentCommentFilters.defaults.commentType);
let mediaType = $state<MediaType>(recentCommentFilters.defaults.mediaType);
let comments = $state<readonly RecentComment[]>([]);
let selected = $state(0);
let loading = $state(false);
let failed = $state(false);
// Only the newest request lands, when the dropdowns change faster than the API answers.
let request = 0;

// Lists get their fanart from their items, once each.
const listFanarts = new SvelteMap<number, string | undefined>();
// OG loaded a fanart when its comment was first selected; the layers stay so going back cross-fades too.
const fanarts = new SvelteSet<string>();
const loaded = new SvelteSet<string>();

const current = $derived(comments.at(selected));
const fanart = $derived(current && (current.fanart ?? (current.listId && listFanarts.get(current.listId))));

function show(entry: RecentComment | undefined) {
  if (entry?.fanart) fanarts.add(entry.fanart);
  const listId = entry?.listId;
  if (!listId || listFanarts.has(listId)) return;
  listFanarts.set(listId, undefined);
  void fetchListFanart({ id: listId }).then((found) => {
    listFanarts.set(listId, found);
    if (found) fanarts.add(found);
  });
}

async function load() {
  const mine = ++request;
  loading = true;
  const result = await fetchRecentComments({ commentType, mediaType }).catch(() => null);
  if (mine !== request) return;

  loading = false;
  failed = result === null;
  comments = result ?? [];
  selected = 0;
  show(comments.at(0));
}

let section = $state<HTMLElement>();
let column = $state<HTMLElement>();

// OG scrolled to the block. Stacked on phones, the comment is under the titles, so og scrolls to it instead. The page
// scrolls smoothly unless reduced motion is on, and the scroll margins clear the header.
function pick(index: number) {
  selected = index;
  show(comments.at(index));
  const stacked = matchMedia('(width < 768px)').matches;
  (stacked ? column : section)?.scrollIntoView({ block: 'start' });
}

function filter(change: { commentType?: CommentType; mediaType?: MediaType }) {
  commentType = change.commentType ?? commentType;
  mediaType = change.mediaType ?? mediaType;
  void load();
}

// The fanart can finish before hydration, and then its load event is gone.
const whenLoaded = (src: string): Attachment<HTMLImageElement> => (image) => {
  if (image.complete && image.naturalWidth > 0) loaded.add(src);
};
</script>

<!-- OG's `item_year_title` and `item_title`: "Breaking Bad 2008", "1x01 Pilot". -->
{#snippet title(entry: RecentComment)}
  {#if entry.year}{entry.title} <span class="year">{entry.year}</span>{:else}{entry.title}{/if}
{/snippet}

{#snippet subtitle(line: NonNullable<RecentComment['subtitle']>)}
  {#if line.number}<span class="number">{line.number}</span> {line.title}{:else}{line.title}{/if}
{/snippet}

<!-- Item hrefs point at og routes that resolve() can't type from a string. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<section
  bind:this={section}
  id="comments"
  class="recent-comments"
  aria-labelledby="{id}-heading"
  aria-busy={loading}
  {@attach nearViewport(load)}
>
  {#each fanarts as src (src)}
    <img
      class={['fanart', { current: src === fanart && loaded.has(src) }]}
      {src}
      alt=""
      decoding="async"
      onload={() => loaded.add(src)}
      {@attach whenLoaded(src)}
    />
  {/each}

  <div class="titles">
    <div class="subnav">
      <h2 id="{id}-heading">Recent Comments</h2>
      <div class="filters">
        <Dropdown variant="transparent" label="Comment type: {recentCommentFilters.commentTypes[commentType]}">
          {#snippet trigger()}{recentCommentFilters.commentTypes[commentType]}{/snippet}
          <ul>
            {#each Object.entries(recentCommentFilters.commentTypes) as [value, label] (value)}
              <li>
                <button type="button" onclick={() => filter({ commentType: value as CommentType })}>{label}</button>
              </li>
            {/each}
          </ul>
        </Dropdown>
        <Dropdown variant="transparent" label="Media type: {recentCommentFilters.mediaTypes[mediaType]}">
          {#snippet trigger()}{recentCommentFilters.mediaTypes[mediaType]}{/snippet}
          <ul>
            {#each Object.entries(recentCommentFilters.mediaTypes) as [value, label] (value)}
              <li><button type="button" onclick={() => filter({ mediaType: value as MediaType })}>{label}</button></li>
            {/each}
          </ul>
        </Dropdown>
      </div>
    </div>

    {#if failed}
      <p class="status" role="status">Doh! We ran into some sort of error.</p>
    {:else}
      <ul class="links">
        {#each comments as entry, index (entry.comment.id)}
          <li>
            <button
              type="button"
              class="link"
              aria-pressed={index === selected}
              aria-controls="{id}-comment"
              onclick={() => pick(index)}
            >
              <span class="title">{@render title(entry)}</span>
              {#if entry.subtitle}<span class="subtitle">{@render subtitle(entry.subtitle)}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div bind:this={column} class="selected" id="{id}-comment">
    {#if current}
      <a class="item-title" href={current.href}>
        <h3>{@render title(current)}</h3>
        {#if current.subtitle}<p class="subtitle">{@render subtitle(current.subtitle)}</p>{/if}
      </a>
      {#key current.comment.id}
        <CommentCard comment={current.comment} item={current.item} {viewer} {dateOptions} wide veiled hideInteractions />
      {/key}
    {/if}
  </div>
</section>

<style>
/* OG's `#recent-comments-wrapper`: the titles and the comment side by side, 50/50 (40/60 below 1200px), stacked on
   phones, over the selected item's fanart. */
.recent-comments {
  position: relative;
  display: grid;
  grid-template-columns: var(--recent-comments-titles-width) minmax(0, 1fr);
  min-block-size: var(--recent-comments-min-height);

  @media (width < 1200px) {
    grid-template-columns: var(--recent-comments-titles-width-tablet) minmax(0, 1fr);
  }

  @media (width < 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.fanart {
  position: absolute;
  inset: 0;
  z-index: 1;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  object-position: var(--recent-comments-fanart-position);
  opacity: 0;
  transition: opacity var(--transition-recent-comments);

  &.current {
    opacity: var(--recent-comments-fanart-opacity);
  }
}

/* Its black paints under the fanart; its content sits over it. */
.titles {
  background-color: var(--color-recent-comments-titles-bg);
  color: var(--color-slider-text);

  & > * {
    position: relative;
    z-index: 5;
  }
}

.subnav {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--gutter);
  padding: var(--recent-comments-subnav-padding);

  @media (width < 768px) {
    padding: var(--recent-comments-subnav-padding-phone);
  }
}

h2 {
  margin: 0;
  font-size: var(--font-size-recent-comments-heading);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.links {
  margin: 0;
  padding: var(--recent-comments-links-padding);
  list-style: none;

  @media (width < 768px) {
    padding: var(--recent-comments-links-padding-phone);
  }
}

.link {
  display: block;
  inline-size: 100%;
  min-block-size: 0;
  margin: 0 0 var(--recent-comments-link-gap);
  padding: 0 0 0 var(--recent-comments-inset);
  border: 0;
  border-radius: 0;
  background: none;
  color: var(--color-recent-comments-link);
  text-align: start;
  transition: color var(--transition-recent-comments);

  &:is(:hover, [aria-pressed='true']) {
    color: var(--color-recent-comments-link-active);
  }

  @media (width < 768px) {
    padding-inline-start: var(--recent-comments-inset-phone);
  }
}

.link .title {
  display: block;
  font-family: var(--font-headings);
  font-size: var(--font-size-h4);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
  overflow-wrap: break-word;
}

.link .subtitle {
  display: block;
  font-family: var(--font-headings);
  font-size: var(--font-size-h5);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--line-height-headings);
  overflow-wrap: break-word;
}

.link .year {
  font-size: var(--font-size-recent-comments-year);
  font-weight: var(--font-weight-headings-light);
}

.number {
  font-weight: var(--font-weight-headings-heavy);
}

.status {
  margin: 0;
  padding: var(--recent-comments-links-padding);
  padding-inline-start: var(--recent-comments-inset);
  color: var(--color-recent-comments-link);
}

/* OG's `#recent-comments`: the veil over the fanart, with the author row pinned to its bottom. */
.selected {
  position: relative;
  z-index: 5;
  background-color: var(--color-recent-comments-veil);
  color: var(--color-text);
  scroll-margin-block-start: var(--header-height);
}

.item-title {
  display: block;
  padding: var(--recent-comments-title-top) 0 0 var(--recent-comments-inset);
  color: var(--color-recent-comments-heading);

  &:is(:hover, :focus-visible) {
    color: var(--color-recent-comments-heading);
    text-decoration: none;
  }

  & h3 {
    margin: 0;
    color: inherit;
    font-size: var(--font-size-recent-comments-title);
    font-weight: var(--font-weight-headings);
  }

  & .year {
    color: var(--color-recent-comments-year);
    font-size: var(--font-size-recent-comments-title-year);
    font-weight: var(--font-weight-headings-light);
  }

  & .subtitle {
    margin: 0;
    color: var(--color-recent-comments-subheading);
    font-family: var(--font-headings);
    font-size: var(--font-size-recent-comments-subtitle);
    font-weight: var(--font-weight-headings-light);
    line-height: var(--line-height-headings);
  }

  @media (width < 768px) {
    padding: var(--recent-comments-title-top-phone) 0 0 var(--recent-comments-inset-phone);

    & h3 {
      font-size: var(--font-size-recent-comments-title-phone);
    }

    & .year {
      font-size: var(--font-size-recent-comments-title-year-phone);
    }
  }
}
</style>

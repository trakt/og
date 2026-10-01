<script lang="ts">
import { page } from '$app/state';
import CommentCard from '$lib/components/comments/CommentCard.svelte';
import ReactionControl from '$lib/components/comments/ReactionControl.svelte';
import { reactionOptions } from '$lib/components/comments/reactionOptions';
import type { CommentViewer } from '$lib/components/comments/CommentViewer';
import CommentWithPoster from '$lib/components/comments/CommentWithPoster.svelte';
import Container from '$lib/components/container/Container.svelte';
import type { CommentResponse } from '@trakt/api';
import {
  client,
  deleted,
  episode,
  formatting,
  inline,
  movie,
  reply,
  review,
  show,
  spoiler,
  staff,
} from './fixtures.ts';

// Signed out, the signed-in member (from the layout), or the author of every comment here, for edit and delete.
type ViewAs = 'out' | 'member' | 'author';
let viewAs = $state<ViewAs>('member');
const viewerFor = (comment: CommentResponse): CommentViewer => {
  if (viewAs === 'out') return null;
  if (viewAs === 'author') return { slug: comment.user.ids.slug ?? '' };
  return { slug: page.data.user?.slug ?? 'og_viewer' };
};

let reaction = $state<typeof reactionOptions[number]['type']>();

let theme = $state(page.url.searchParams.get('theme') ?? 'light');
$effect(() => {
  document.documentElement.dataset.theme = theme;
  return () => delete document.documentElement.dataset.theme;
});
</script>

<svelte:head>
  <title>Comment card · og design system</title>
</svelte:head>

<main>
  <section>
    <Container>
      <h1>Comment card</h1>
      <p>
        OG's comment card on made-up comments, one of them showing every formatting rule. "N replies" opens the
        replies inline. Replying, editing, deleting and blocking work on the page and never reach the API. The reaction
        picker works for the signed-in viewer, and the report dialog sends for real.
      </p>
      <div class="controls">
        <label>
          Theme
          <select bind:value={theme}>
            <option value="light">Light (OG default)</option>
            <option value="dark">Dark (dark knight)</option>
          </select>
        </label>
        <label>
          Viewer
          <select bind:value={viewAs}>
            <option value="out">Signed out</option>
            <option value="member">Signed-in member</option>
            <option value="author">The author</option>
          </select>
        </label>
      </div>

      <h2>Reaction picker</h2>
      <p>Choose an emoji, replace it, or choose the selected one again to remove it. This example stays on this page.</p>
      <div class="reaction-demo">
        <ReactionControl value={reaction} onopen={() => Promise.resolve(true)}
          onselect={(type) => (reaction = reaction === type ? undefined : type)} />
      </div>

      <h2>A review in a comment list: featured and wide</h2>
      <CommentCard comment={review} item={movie} viewer={viewerFor(review)} {client}
        dateOptions={page.data.datePreferences} featured wide />

      <h2>Formatting, and an edit more than a day after posting</h2>
      <CommentCard comment={formatting} item={show} viewer={viewerFor(formatting)} {client}
        dateOptions={page.data.datePreferences} wide />

      <h2>Spoilers: the whole comment, then an inline spoiler</h2>
      <CommentCard comment={spoiler} item={episode} viewer={viewerFor(spoiler)} {client}
        dateOptions={page.data.datePreferences} featured wide />
      <CommentCard comment={inline} item={episode} viewer={viewerFor(inline)} {client}
        dateOptions={page.data.datePreferences} wide />

      <h2>Staff, and a deleted member</h2>
      <CommentCard comment={staff} item={episode} viewer={viewerFor(staff)} {client}
        dateOptions={page.data.datePreferences} />
      <CommentCard comment={deleted} item={show} viewer={viewerFor(deleted)} {client}
        dateOptions={page.data.datePreferences} />

      <h2>A reply out of its thread, with its parent</h2>
      <CommentCard comment={reply} item={movie} parent={review} viewer={viewerFor(reply)} {client}
        dateOptions={page.data.datePreferences} wide />

      <h2>On its own page: the author row on the page's band</h2>
      <div class="read">
        <CommentCard comment={formatting} item={show} viewer={viewerFor(formatting)} {client}
          dateOptions={page.data.datePreferences} repliesAnchor="#replies" wide read />
      </div>

      <h2>Discover's Recent Comments: veiled, the author row pinned to the column's bottom</h2>
      <div class="veiled">
        <CommentCard comment={review} item={movie} viewer={viewerFor(review)} {client}
          dateOptions={page.data.datePreferences} wide veiled hideInteractions />
      </div>

      <h2>Beside its poster, on a user's page</h2>
      <CommentWithPoster poster={{ href: '/movies/heat-1995', title: movie.title }} inlineTitle={movie.title}>
        <CommentCard comment={review} item={movie} viewer={viewerFor(review)} {client}
          dateOptions={page.data.datePreferences} featured wide />
      </CommentWithPoster>
    </Container>
  </section>
</main>

<style>
section {
  padding-block: var(--gutter) calc(var(--gutter) * 2);

  & :global(.comment-wrapper:not(.nested)) {
    margin-block-end: var(--gutter);
  }
}

/* The comment page draws the band across the page; this stands in for it. */
.read {
  background: linear-gradient(var(--color-comment-page-band) var(--comment-page-band), transparent 0);
}

.reaction-demo {
  margin-block-end: var(--gutter);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-comment-meta);
  text-transform: uppercase;
}

/* Discover's comment column: the veil over a stand-in fanart, positioned for the author row. */
.veiled {
  position: relative;
  min-block-size: 400px;
  background:
    linear-gradient(var(--color-recent-comments-veil), var(--color-recent-comments-veil)),
    linear-gradient(var(--color-slider-bg), var(--brand-primary));
}

.controls {
  display: flex;
  gap: var(--gutter);
}

label {
  display: inline-grid;
  gap: var(--space-sm-block);
}
</style>

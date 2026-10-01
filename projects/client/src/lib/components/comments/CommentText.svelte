<!--
  A comment's text, from the tree `parseComment` builds. Every string goes through Svelte's text and attribute
  escaping, so nothing a member types becomes markup. Headings a member types keep OG's look but not heading
  semantics, so a comment can't add to the page's outline.
-->
<script lang="ts">
import { isPlainClick } from '$lib/utils/isPlainClick';
import type { CommentBlock } from './text/CommentBlock.ts';
import type { CommentInline } from './text/CommentInline.ts';
import InlineSpoiler from './InlineSpoiler.svelte';

interface Props {
  blocks: readonly CommentBlock[];
  /** Plays a YouTube link in the video lightbox. Left out, the link opens YouTube in a new tab. */
  onvideo?: (url: string) => void;
}

const { blocks, onvideo }: Props = $props();

const openVideo = (link: Extract<CommentInline, { type: 'link' }>) => (event: MouseEvent) => {
  if (!link.video || !onvideo || !isPlainClick(event)) return;
  event.preventDefault();
  onvideo(link.href);
};
</script>

<!-- Mentions point at og's /users routes, which resolve() only takes once they exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#snippet inlines(nodes: readonly CommentInline[])}
  <!-- The branches run on with no whitespace between tags, so none creeps in between the pieces. -->
  {#each nodes as node, i (i)}{#if node.type === 'text'}{node.text}{:else if node.type === 'break'}<br />{:else if node.type === 'strong'}<strong>{@render inlines(node.children)}</strong>{:else if node.type === 'em'}<em>{@render inlines(node.children)}</em>{:else if node.type === 'del'}<del>{@render inlines(node.children)}</del>{:else if node.type === 'mark'}<mark>{@render inlines(node.children)}</mark>{:else if node.type === 'code'}<code>{node.text}</code>{:else if node.type === 'link'}<a
  class="comment-link" href={node.href} target="_blank" rel="noopener noreferrer ugc"
  onclick={openVideo(node)}>{@render inlines(node.children)}</a>{:else if node.type === 'mention'}<a
  class="comment-link" href="/users/{node.username}">@{node.username}</a>{:else if node.type === 'emoji'}<span
  class="emoji"
  title={node.shortname}>{node.emoji}</span>{:else if node.type === 'spoiler'}<InlineSpoiler>{@render inlines(node.children)}</InlineSpoiler>{/if}{/each}
{/snippet}

{#snippet render(list: readonly CommentBlock[])}
  {#each list as block, i (i)}
    {#if block.type === 'paragraph'}
      <p class={[block.author && `author author-${block.author}`]}>{@render inlines(block.children)}</p>
    {:else if block.type === 'heading'}
      <p class="heading level-{block.level}">{@render inlines(block.children)}</p>
    {:else if block.type === 'quote'}
      <blockquote>{@render render(block.children)}</blockquote>
    {:else if block.type === 'list' && block.ordered}
      <ol>{#each block.items as item, j (j)}<li>{@render inlines(item)}</li>{/each}</ol>
    {:else if block.type === 'list'}
      <ul>{#each block.items as item, j (j)}<li>{@render inlines(item)}</li>{/each}</ul>
    {:else if block.type === 'code'}
      <pre><code>{block.text}</code></pre>
    {:else}
      <hr />
    {/if}
  {/each}
{/snippet}

<div class="comment-text">{@render render(blocks)}</div>

<style>
/* `.comment` Everything keeps the text's size. */
.comment-text {
  overflow-wrap: break-word;

  & :global(*) {
    font-size: inherit;
  }
}

p {
  margin: 0 0 calc(var(--line-height-computed) / 2);

  &:last-child {
    margin-block-end: 0;
  }
}

.author {
  margin: 0 0 15px;
  padding: 7px 0 7px 15px;
  border-inline-start: 2px solid var(--color-comment-author);

  & + .author {
    margin-block-start: -15px;
  }
}

.author-1 {
  border-inline-start-color: var(--brand-primary);
}

.author-2 {
  border-inline-start-color: var(--brand-secondary);
}

.author-3 {
  border-inline-start-color: var(--brand-tertiary);
}

.author-4 {
  border-inline-start-color: var(--brand-quaternary);
}

.author-5 {
  border-inline-start-color: var(--brand-fifth);
}

.author-6 {
  border-inline-start-color: var(--brand-sixth);
}

.heading {
  margin: var(--gutter) 0 var(--space-lg-block);
  border-block-end: 1px solid var(--color-comment-rule);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
}

.level-1 {
  font-size: 160%;
}

.level-2 {
  font-size: 140%;
}

.level-3 {
  font-size: 130%;
}

.level-4 {
  font-size: 120%;
}

.level-5 {
  font-size: 110%;
}

.level-6 {
  font-size: 100%;
}

blockquote {
  margin: 0 0 var(--gutter);
  padding: var(--space-lg-block) 15px;
  border-inline-start: 5px solid var(--color-comment-quote-border);
  /* A parent comment shown inside a reply sets its own. */
  background-color: var(--comment-quote-bg, var(--color-comment-quote-bg));

  &:last-child {
    margin-block-end: 0;
  }
}

ul,
ol {
  margin: 0 0 calc(var(--line-height-computed) / 2);
}

pre {
  margin: 0 0 calc(var(--line-height-computed) / 2);
  padding: 9.5px;
  overflow: auto;
  /* The comment's own page sets its own. */
  background-color: var(--comment-pre-bg, var(--color-comment-quote-bg));
  color: var(--color-comment-pre-text);
  line-height: var(--line-height-base);
  white-space: pre-wrap;

  & code {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
  }
}

hr {
  border-block-start-color: var(--color-comment-rule);
}

mark {
  padding: 2px 4px;
  border-radius: var(--radius-code);
  background-color: var(--color-comment-mark-bg);
  color: var(--color-comment-mark-text);
}

.comment-link {
  text-decoration: none;
}
</style>

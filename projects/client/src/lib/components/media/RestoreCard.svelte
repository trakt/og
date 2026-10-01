<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import posterPlaceholder from '$lib/assets/placeholders/poster.png';
const { title, parentTitle, date, image, avatar = false, busy = false, onclick }: {
  title: string;
  parentTitle?: string;
  date: string;
  image?: string;
  avatar?: boolean;
  busy?: boolean;
  onclick: () => void;
} = $props();
const fallback = $derived(
  avatar ? 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png' : posterPlaceholder,
);
const source = $derived(image ?? fallback);
let failed = $state(false);
$effect(() => {
  if (source) failed = false;
});
</script>
<article class="restore-card">
  <Tooltip text="Click to restore">
    {#snippet trigger(tip)}
      <button type="button" class:avatar aria-label={avatar ? `Unblock ${title}` : `Restore ${title}`} aria-busy={busy} aria-disabled={busy} {onclick} {...tip}>
        <img src={failed ? fallback : source} onerror={() => { failed = true; }} alt="" loading="lazy" />
        <span class="titles"><span class="title">{title}</span>{#if parentTitle}<span class="subtitle">{parentTitle}</span>{/if}<em class="subtitle">{date}</em>{#if !parentTitle && !avatar}<span class="subtitle" aria-hidden="true">&nbsp;</span>{/if}</span>
      </button>
    {/snippet}
  </Tooltip>
</article>
<style>
.restore-card {
  min-inline-size: 0;
}
button {
  display: block;
  inline-size: 100%;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-text);
  font: inherit;
  cursor: pointer;
  transition: opacity var(--transition-card);
  img {
    display: block;
    inline-size: 100%;
    aspect-ratio: var(--ratio-poster);
    border: var(--hidden-card-border) solid var(--color-card-border);
    object-fit: cover;
  }
  &:is(:hover, :focus-visible) .title {
    text-decoration: underline;
  }
  &.avatar img {
    aspect-ratio: 1;
    border-radius: 50%;
    border-width: var(--hidden-avatar-border);
    border-color: var(--color-avatar-border);
  }
  &[aria-busy='true'] {
    cursor: wait;
  }
}
.titles {
  display: block;
  margin-block-end: var(--space-sm-block);
  text-align: center;
}
.title,
.subtitle {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-headings);
}
.title {
  margin-block-start: var(--space-lg-block);
  font-family: var(--font-headings);
  font-size: var(--font-size-card-title);
  line-height: var(--hidden-title-line);
}
.subtitle {
  margin-block-start: var(--space-sm-block);
  color: var(--color-card-subtitle);
  font-size: var(--font-size-card-subtitle);
  line-height: var(--hidden-subtitle-line);
}
@media (prefers-reduced-motion: reduce) {
  button {
    transition: none;
  }
}
</style>

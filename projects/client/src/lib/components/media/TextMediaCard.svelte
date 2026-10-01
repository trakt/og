<script lang="ts">
import type { ComponentProps } from 'svelte';
import QuickIcons from '$lib/components/media/QuickIcons.svelte';

interface Props {
  href: string;
  title: string;
  number?: string;
  smallTitle?: { text: string; href: string };
  tagline?: string;
  schedule?: string;
  tags?: readonly { text: string; kind?: string }[];
  faded?: boolean;
  compact?: boolean;
  icons?: Omit<ComponentProps<typeof QuickIcons>, 'small'>;
}
const { href, title, number, smallTitle, tagline, schedule, tags = [], faded = false, compact = false, icons }: Props =
  $props();
const premiere = $derived(tags.find((tag) => tag.kind?.endsWith('premiere') || tag.kind?.endsWith('finale')));
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<article class={['text-media-card', { faded, compact }]}>
  <h3><a href={smallTitle?.href ?? href}>{smallTitle?.text ?? title}</a></h3>
  {#if tagline}<p>{tagline}</p>{:else if number}<a class="episode-title" {href}><strong>{number}</strong>&nbsp;{title}</a>{/if}
  {#if premiere || schedule}<p class="schedule">{#if premiere}<span class="premiere" style:--tag-color="var(--episode-{premiere.kind})">{premiere.text}</span> {/if}{schedule}</p>{/if}
  {#if icons}<QuickIcons {...icons} small compact />{/if}
</article>

<style>
.text-media-card {
  padding: var(--space-lg-block) var(--space-sm-inline) 0;
  min-inline-size: 0;
  &.faded:not(:hover, :focus-within) {
    opacity: var(--opacity-faded);
  }
  & :global(.quick-icons) {
    margin: var(--space-lg-block) calc(-1 * var(--space-xs-inline));
  }
}
h3 {
  margin: 0 0 var(--space-sm-block);
  font-size: var(--calendar-text-title-size);
  font-weight: var(--font-weight-headings);
}
a {
  color: var(--brand-primary);
}
p {
  margin: 0;
  line-height: var(--line-height-headings);
}
.episode-title {
  display: block;
  line-height: var(--line-height-headings);
}
.schedule {
  margin-block-start: var(--space-sm-block);
  font-family: var(--font-headings);
  font-size: var(--font-size-card-subtitle);
}
.premiere {
  display: inline-block;
  margin-inline-end: var(--space-xs-inline);
  .compact & {
    display: block;
    inline-size: fit-content;
    margin-block-end: var(--space-sm-block);
  }
  padding: var(--calendar-text-tag-padding);
  background: var(--tag-color);
  color: var(--color-frame-text);
}
</style>

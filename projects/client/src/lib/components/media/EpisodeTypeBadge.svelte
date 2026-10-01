<script lang="ts">
import { page } from '$app/state';
interface Props {
  label: string;
  kind:
    | 'series-premiere'
    | 'season-premiere'
    | 'mid-season-premiere'
    | 'mid-season-finale'
    | 'season-finale'
    | 'series-finale'
    | 'bonus'
    | 'trailer';
}
const { label, kind }: Props = $props();
</script>

{#if !page.data.settings?.browsing?.hide_episode_type_tags}<span class="episode-badge"
  style:--episode-color="var(--episode-{kind})">{label}</span>{/if}

<style>
.episode-badge {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  z-index: 1;
  padding-block: var(--episode-badge-padding);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-episode-badge);
  font-weight: var(--font-weight-headings);
  line-height: 1;
  letter-spacing: var(--episode-badge-letter-spacing);
  text-align: center;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--episode-color);
    opacity: var(--episode-badge-opacity);
  }
}
</style>

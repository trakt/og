<!--
  The "Videos" box under a summary's overview : grey tiles for the trailer and the
  credits scenes. A YouTube trailer plays in a lightbox; a middle click or a modified click still opens YouTube.
  Credits scenes have no URL in the API, so their tiles search YouTube for "<title> during credits scene".
-->
<script lang="ts">
import VideoPopup from '$lib/components/dialog/VideoPopup.svelte';
import { youtubeEmbedUrl } from '$lib/components/dialog/youtubeEmbedUrl';
import youtube from '$lib/icons/brands/youtube.svg?raw';
import { isPlainClick } from '$lib/utils/isPlainClick';
import SummaryTile from './SummaryTile.svelte';

interface Props {
  /** The full title the credits searches use, e.g. "Fight Club (1999)". */
  title: string;
  trailer?: string | null;
  duringCredits?: boolean | null;
  afterCredits?: boolean | null;
}

const { title, trailer, duringCredits, afterCredits }: Props = $props();

const search = (scene: string) =>
  `https://youtube.com/results?${new URLSearchParams({ search_query: `${title} ${scene} credits scene` })}`;
const credits = $derived(
  [
    { scene: 'During', show: duringCredits },
    { scene: 'After', show: afterCredits },
  ].filter(({ show }) => show),
);

let playing = $state<string>();

function play(event: MouseEvent) {
  if (!trailer || !youtubeEmbedUrl(trailer) || !isPlainClick(event)) return;
  event.preventDefault();
  playing = trailer;
}
</script>

{#if trailer || credits.length > 0}
  <div class="videos">
    <h2 class="title">Videos</h2>
    {#if trailer}
      <SummaryTile icon={youtube} site="Trailer" href={trailer} target="_blank" rel="noopener" onclick={play} />
    {/if}
    {#each credits as { scene } (scene)}
      <SummaryTile icon={youtube} price={scene} site="Credits" href={search(scene.toLowerCase())} target="_blank"
        rel="noopener" />
    {/each}
  </div>
{/if}

{#if playing}
  <VideoPopup bind:url={playing} title="{title} trailer" />
{/if}

<style>
.title {
  margin: 0 0 2px;
  color: var(--color-summary-label);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-base);
  text-transform: uppercase;
}
</style>

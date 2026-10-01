<!--
  OG's share icon (`global.js:6158-6210`): the Web Share API where the browser has one ("Share Link"), otherwise it
  copies the link and says so in a toast ("Copy Link").
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import arrowUpFromBracket from '$lib/icons/light/arrow-up-from-bracket.svg?raw';
import { toast } from '../toast/toast.svelte.ts';
import Tooltip from '../tooltip/Tooltip.svelte';

interface Props {
  url: string;
  title?: string;
  /** List title rows use the unscaled icon; rows and summaries keep OG's fa-lg size. */
  large?: boolean;
}

const { url, title, large = true }: Props = $props();

// The server can't know, so it renders the copy tooltip and the browser corrects it.
let canShare = $state(false);
const detectShare = () => {
  canShare = typeof navigator.share === 'function';
};

const copy = async () => {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to your clipboard!');
  } catch {
    toast.error('We could not copy this link. Please try again.');
  }
};

const share = async () => {
  if (!canShare) return copy();
  // A dismissed share sheet rejects with AbortError; there's nothing to tell the user.
  await navigator.share({ title, url }).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    return copy();
  });
};

const label = $derived(canShare ? 'Share Link' : 'Copy Link');
</script>

<Tooltip text={label}>
  {#snippet trigger(tooltip)}
    <button type="button" class={['share', { normal: !large }]} aria-label={label} onclick={share} {@attach detectShare} {...tooltip}>
      <Icon svg={arrowUpFromBracket} />
    </button>
  {/snippet}
</Tooltip>

<style>
/* fa-lg: a third larger, nudged down a little. */
.share {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: 1.3333em;
  line-height: 0.75em;
  vertical-align: -0.0667em;

  &.normal {
    font-size: inherit;
    line-height: inherit;
    vertical-align: baseline;
  }
}
</style>

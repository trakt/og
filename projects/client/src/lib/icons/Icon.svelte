<!--
  An OG icon, extracted from OG's fonts by `deno task icon <family> <name>`.
  Import the SVG raw so only the icons a page uses get bundled:
    import gear from '$lib/icons/thin/gear.svg?raw';
    <Icon svg={gear} />
  It sits on the text baseline like OG's icon fonts did, and takes its size from font-size and its color from `color`.
-->
<script lang="ts">
import { parseIconSvg } from './parseIconSvg.ts';

interface Props {
  svg: string;
  /** Names the icon for screen readers. Leave it out when the icon is decorative or text next to it says the same. */
  label?: string;
  /** At least 1.25em wide with the glyph centered, like OG's `fa-fw`, so icons stacked in a column line up. */
  fixedWidth?: boolean;
}

const { svg, label, fixedWidth = false }: Props = $props();
const icon = $derived(parseIconSvg(svg));
</script>

<svg
  class={['icon', { 'fixed-width': fixedWidth }]}
  viewBox={icon.viewBox}
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
  focusable="false"
>
  <path fill="currentColor" d={icon.pathData} />
</svg>

<style>
/* Extracted SVGs are 1em tall with the baseline 1/8em above the bottom, which puts the glyph where OG's font did. */
.icon {
  display: inline-block;
  block-size: 1em;
  inline-size: auto;
  vertical-align: -0.125em;
  overflow: visible;
}

/* At least 1.25em, with the glyph centered. Like fa-fw, it never shrinks a wider glyph. */
.fixed-width {
  min-inline-size: 1.25em;
}
</style>

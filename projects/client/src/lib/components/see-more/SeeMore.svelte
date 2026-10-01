<!--
  OG's "see more" link: uppercase text and a circled arrow, floated to the right of a
  section heading. "See more" unless you pass `text`. Like OG's bare `a.see-more-link` it takes the link color of
  wherever it sits: red, or the caller's own link color (a slider's gray, the summary sidebar's). With `iconOnly` the
  text is only for screen readers and shows as a tooltip, like the arrows in the summary sidebar. With `controls`
  instead of `href` it's a disclosure button for that element, like OG's "Expand" on a collapsed panel.
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import circleRight from '$lib/icons/trakt/circle-right.svg?raw';

type Props =
  & { text?: string; iconOnly?: boolean }
  & (
    | {
      href: string;
      controls?: never;
      /** Opens in a new tab, like OG's `target: '_blank'` forum links ("Learn More"). */
      external?: boolean;
    }
    | { href?: never; controls: string; expanded: boolean; ontoggle: () => void; external?: never }
  );

const props: Props = $props();
const text = $derived(props.text ?? 'See more');
const iconOnly = $derived(props.iconOnly ?? false);
</script>

<!-- Hrefs point at OG routes og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<Tooltip text={iconOnly ? text : undefined}>
  {#snippet trigger(tooltip)}
    {#if props.controls}
      <button type="button" class={['see-more', { 'icon-only': iconOnly }]} aria-controls={props.controls}
        aria-expanded={props.expanded} onclick={props.ontoggle} {...tooltip}>
        <span class="text">{text}</span><span class="arrow"><Icon svg={circleRight} /></span>
      </button>
    {:else}
      <a
        class={['see-more', { 'icon-only': iconOnly }]}
        href={props.href}
        target={props.external ? '_blank' : undefined}
        rel={props.external ? 'noopener' : undefined}
        {...tooltip}
      >
        <span class="text">{text}</span><span class="arrow"><Icon svg={circleRight} /></span>
      </a>
    {/if}
  {/snippet}
</Tooltip>

<style>
.see-more {
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-see-more);
  line-height: 2;
  text-transform: uppercase;
}

/* The disclosure button looks like the link, in the color of wherever it sits. */
button.see-more {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
}

.arrow {
  display: inline-block;
  margin: -2px 0 0 var(--space-see-more-icon);
  font-size: var(--font-size-see-more-icon);
  line-height: 1;
  vertical-align: middle;
  transition: color var(--transition-card);
}

.icon-only .text {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>

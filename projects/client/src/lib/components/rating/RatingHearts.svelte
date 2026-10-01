<!--
  OG's row of 10 rating hearts (`.rating-hearts`), the body of the rating popover. Pointing at heart N fills 1 to N in
  rating N's color. At rest the current rating stays filled.
  The hearts are a real radio group. Clicking a heart rates it, and clicking the current rating unrates it
  (`onrate(null)`). With the keyboard, arrow keys only move the preview (so moving from 1 to 9 doesn't send eight
  ratings), and Enter or Space commits the focused heart the same way a click does.
  `onpreview` reports the heart being pointed at or focused, so the popover title can follow it (see `ratingPrompt`).
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import heart from '$lib/icons/solid/heart.svg?raw';

interface Props {
  value: number | null;
  onrate: (rating: number | null) => void;
  /** Called with the heart being pointed at or focused, or null, so the popover title can follow it. */
  onpreview?: (rating: number | null) => void;
  label?: string;
}

const { value, onrate, onpreview, label = 'Your rating' }: Props = $props();
const name = $props.id();
const ratings = Array.from({ length: 10 }, (_, i) => i + 1);

let hovered = $state<number | null>(null);
let focusInside = $state(false);
// The radio the arrow keys moved to. It resets to the committed rating when a new one comes in.
let focused = $derived<number | null>(value);
const active = $derived(hovered ?? focused);

const preview = $derived(hovered ?? (focusInside ? focused : null));
$effect(() => onpreview?.(preview));

function commit(rating: number) {
  onrate(rating === value ? null : rating);
}

function onkeydown(event: KeyboardEvent, rating: number) {
  if (event.key.startsWith('Arrow')) focusInside = true;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  commit(rating);
}
</script>

<div
  class="hearts"
  role="radiogroup"
  aria-label={label}
  onfocusout={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      focused = value;
      focusInside = false;
    }
  }}
  style:--fill={active === null ? undefined : `var(--rating-${active})`}
>
  {#each ratings as rating (rating)}
    <input
      type="radio"
      id="{name}-{rating}"
      {name}
      value={rating}
      checked={rating === focused}
      onchange={() => (focused = rating)}
      onkeydown={(event) => onkeydown(event, rating)}
    />
    <!-- The radio inside the label handles the keyboard. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <label
      for="{name}-{rating}"
      class={{ filled: active !== null && rating <= active }}
      onpointerenter={() => (hovered = rating)}
      onpointerleave={() => (hovered = null)}
      onclick={(event) => {
        event.preventDefault();
        commit(rating);
      }}
    >
      <Icon svg={heart} label={rating === 1 ? '1 heart' : `${rating} hearts`} />
    </label>
  {/each}
</div>

<style>
.hearts {
  display: inline-flex;
}

input {
  position: absolute;
  clip-path: inset(50%);
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
}

label {
  inline-size: 1.22em;
  margin: 0;
  padding: 0 0.2em;
  overflow: hidden;
  color: var(--color-rating-empty);
  font-size: var(--font-size-icon-lg);
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.1s;

  &.filled {
    color: var(--fill);
  }

  &:active {
    translate: 2px 2px;
  }
}

input:focus-visible + label {
  outline: 2px solid var(--color-input-border-focus);
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  label {
    transition: none;
  }
}
</style>

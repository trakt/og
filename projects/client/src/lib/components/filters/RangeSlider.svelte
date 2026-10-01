<!--
  OG's two-handle noUiSlider (the advanced filters' years, runtime and rating sliders): a dark track, a lighter
  bar between the handles, and grey handles. `labeled` handles are wider and carry their value, like the rating
  sliders. Each handle is a `role="slider"`: arrows step, Page Up and Down take ten steps, Home and End jump to the
  ends. Dragging a handle or pressing the track moves the nearest one.
    <RangeSlider bind:value scale={filterRanges({ now }).years} label="Released" />
-->
<script lang="ts">
import { fromPercent, type RangeScale, scaleMax, scaleMin, toPercent } from './rangeScale.ts';

interface Props {
  value: readonly [number, number];
  scale: RangeScale;
  /** Names the pair: each handle is "<label> minimum" and "<label> maximum". */
  label: string;
  labeled?: boolean;
  format?: (value: number) => string;
}

let { value = $bindable(), scale, label, labeled = false, format = (v: number) => `${v}` }: Props = $props();

let track = $state<HTMLElement>();
const min = $derived(scaleMin(scale));
const max = $derived(scaleMax(scale));
const percents = $derived(value.map((v) => toPercent(v, scale)) as [number, number]);

const round = (v: number) => Number(v.toFixed(`${scale.step}`.split('.').at(1)?.length ?? 0));

function set(index: 0 | 1, next: number) {
  const bounded = index === 0 ? Math.min(Math.max(next, min), value[1]) : Math.max(Math.min(next, max), value[0]);
  const v = round(bounded);
  if (v === value[index]) return;
  value = index === 0 ? [v, value[1]] : [value[0], v];
}

function onkeydown(event: KeyboardEvent, index: 0 | 1) {
  const step = scale.step;
  const moves: Record<string, number> = {
    ArrowLeft: value[index] - step,
    ArrowDown: value[index] - step,
    ArrowRight: value[index] + step,
    ArrowUp: value[index] + step,
    PageDown: value[index] - step * 10,
    PageUp: value[index] + step * 10,
    Home: min,
    End: max,
  };
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  set(index, next);
}

const percentAt = (clientX: number) => {
  const rect = track?.getBoundingClientRect();
  return rect && rect.width > 0 ? ((clientX - rect.left) / rect.width) * 100 : 0;
};

let dragging = $state<0 | 1 | null>(null);

function startDrag(event: PointerEvent, index: 0 | 1) {
  if (event.button !== 0) return;
  event.preventDefault();
  dragging = index;
  track?.setPointerCapture(event.pointerId);
  track?.querySelectorAll<HTMLElement>('[role="slider"]')[index]?.focus();
}

function ontrackdown(event: PointerEvent) {
  const next = fromPercent(percentAt(event.clientX), scale);
  // The nearer handle, or the one on the side of the press when both sit together.
  const index = Math.abs(next - value[0]) < Math.abs(next - value[1]) || next < value[0] ? 0 : 1;
  startDrag(event, index);
  set(index, next);
}

function onpointermove(event: PointerEvent) {
  if (dragging === null) return;
  set(dragging, fromPercent(percentAt(event.clientX), scale));
}

const stop = () => (dragging = null);
</script>

<div class={['slider', { labeled, dragging: dragging !== null }]}>
  <div
    class="track"
    bind:this={track}
    role="presentation"
    onpointerdown={ontrackdown}
    {onpointermove}
    onpointerup={stop}
    onpointercancel={stop}
  >
    <div class="connect" style:inset-inline="{percents[0]}% {100 - percents[1]}%"></div>
    {#each [0, 1] as const as index (index)}
      <span
        class="handle"
        role="slider"
        tabindex="0"
        style:inset-inline-start="{percents[index]}%"
        aria-label="{label} {index === 0 ? 'minimum' : 'maximum'}"
        aria-valuemin={index === 0 ? min : value[0]}
        aria-valuemax={index === 0 ? value[1] : max}
        aria-valuenow={value[index]}
        aria-valuetext={format(value[index])}
        onkeydown={(event) => onkeydown(event, index)}
        onpointerdown={(event) => {
          event.stopPropagation();
          startDrag(event, index);
        }}
      >{#if labeled}{format(value[index])}{/if}</span>
    {/each}
  </div>
</div>

<style>
.slider {
  touch-action: none;
}

.track {
  position: relative;
  block-size: var(--slider-height);
  border-radius: var(--radius-slider);
  background-color: var(--color-slider-track);
  cursor: pointer;
}

.connect {
  position: absolute;
  inset-block: 0;
  border-radius: var(--radius-slider-connect);
  background-color: var(--color-slider-connect);
  box-shadow: var(--shadow-slider-connect);
}

/* noUiSlider hangs each handle 7px left of its value, so the upper rating handle sticks out past the track. */
.handle {
  position: absolute;
  inset-block-start: var(--slider-handle-top);
  margin-inline-start: var(--slider-handle-offset);
  inline-size: var(--slider-handle-width);
  block-size: var(--slider-handle-height);
  border-radius: var(--radius-slider-handle);
  background-color: var(--color-slider-handle);
  cursor: grab;

  .labeled & {
    inset-block-start: var(--slider-label-top);
    inline-size: var(--slider-label-width);
    block-size: var(--slider-label-height);
    color: var(--color-filter-control-text);
    font-family: var(--font-headings);
    font-size: var(--font-size-slider-label);
    font-weight: var(--font-weight-headings);
    line-height: var(--slider-label-height);
    text-align: center;
    white-space: nowrap;
  }

  .dragging & {
    cursor: grabbing;
  }
}
</style>

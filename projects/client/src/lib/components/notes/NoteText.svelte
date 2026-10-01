<script lang="ts">
interface Props {
  text: string;
  concealed?: boolean;
}
const { text, concealed = false }: Props = $props();
const id = $props.id();
let revealed = $state(false);
let expanded = $state(false);
let collapsible = $state(false);
const hidden = $derived(concealed && !revealed);
const paragraphs = $derived(text.split(/\n\s*\n/));

function measure(element: HTMLElement) {
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const maximum = Number.parseFloat(getComputedStyle(element).getPropertyValue('--note-text-max-height'));
      collapsible = element.scrollHeight > maximum;
    });
  });
  observer.observe(element);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}
</script>

<div class="note-text" class:hidden>
  <div id={id} class="text" class:collapsed={collapsible && !expanded} aria-hidden={hidden} {@attach measure}>
    {#each paragraphs as paragraph, i (i)}<p>{paragraph}</p>{/each}
  </div>
  {#if hidden}
    <button class="reveal" type="button" aria-label="Reveal spoiler note" onclick={() => revealed = true}></button>
  {:else if collapsible}
    <button class="read-more" type="button" aria-controls={id} aria-expanded={expanded} onclick={() => expanded = !expanded}>
      {expanded ? 'Read less...' : 'Read more...'}
    </button>
  {/if}
</div>

<style>
.note-text {
  position: relative;
}
.text {
  overflow-wrap: anywhere;
  white-space: pre-line;
}
p {
  margin: 0 0 var(--line-height-computed);
  &:last-child {
    margin-block-end: 0;
  }
}
.collapsed {
  position: relative;
  max-block-size: var(--note-text-max-height);
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: var(--note-text-shade-height);
    background: linear-gradient(transparent, var(--color-note-bg));
    pointer-events: none;
  }
}
.hidden .text {
  filter: blur(var(--note-spoiler-blur));
  user-select: none;
}
.reveal {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  min-block-size: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
}
.read-more {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-link);
  &:hover {
    color: var(--color-link-hover);
  }
}
</style>

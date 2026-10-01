import type { TransitionConfig } from 'svelte/transition';

/** OG hides the entire note/poster row over one second. Hand focus to the next row or the section. */
export function removeNote(node: HTMLElement): TransitionConfig {
  const active = document.activeElement;
  const hadFocus = node.contains(active) || active === document.body || !active?.checkVisibility();
  node.inert = true;
  if (hadFocus) {
    const section = node.closest<HTMLElement>('section');
    const rows = Array.from(section?.querySelectorAll<HTMLElement>('[data-note-row]') ?? []);
    const index = rows.indexOf(node);
    const next = [...rows.slice(index + 1), ...rows.slice(0, index).reverse()].find((row) => !row.inert);
    const focus = next?.querySelector<HTMLElement>('.note-manage button') ?? section;
    if (focus === section && section) section.tabIndex = -1;
    focus?.focus({ preventScroll: true });
  }
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : Number.parseFloat(getComputedStyle(node).getPropertyValue('--card-remove-fade-duration'));
  const height = node.getBoundingClientRect().height;
  return { duration, css: (t) => `opacity: ${t}; height: ${height * t}px; overflow: hidden;` };
}

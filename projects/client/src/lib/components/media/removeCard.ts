import type { TransitionConfig } from 'svelte/transition';

/** OG fades a removed card for a second, then collapses it for a second. */
export function removeCard(node: HTMLElement, enabled: () => boolean): TransitionConfig {
  if (!enabled()) return { duration: 0 };
  const section = node.closest<HTMLElement>('section');
  const cards = Array.from(section?.querySelectorAll<HTMLElement>('article') ?? []);
  const index = cards.indexOf(node);
  node.inert = true;
  if (node.contains(document.activeElement)) {
    const next = [...cards.slice(index + 1), ...cards.slice(0, index).reverse()].find((card) => !card.inert);
    const focus = next?.querySelector<HTMLElement>('button, a.titles-link') ?? section;
    if (focus === section && section) section.tabIndex = -1;
    focus?.focus({ preventScroll: true });
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return { duration: 0 };
  const duration = Number.parseFloat(getComputedStyle(node).getPropertyValue('--card-remove-fade-duration'));
  const height = node.getBoundingClientRect().height;
  return {
    duration: duration * 2,
    css: (t) => `opacity: ${Math.max(0, t * 2 - 1)}; height: ${height * Math.min(1, t * 2)}px; overflow: hidden;`,
  };
}

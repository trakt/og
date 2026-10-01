import { tick } from 'svelte';

/** Scrolls to a card once it renders and moves focus to it, after posting or saving . */
export async function focusComment(id: number): Promise<void> {
  await tick();
  const card = document.getElementById(`comment-${id}`);
  card?.scrollIntoView({ block: 'start' });
  card?.setAttribute('tabindex', '-1');
  card?.focus({ preventScroll: true });
}

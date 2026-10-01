type Click = Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>;

/**
 * A primary-button click with no modifier. Links that open something in the page (a video lightbox, say) only take
 * those, so a middle click or a modified click still does what the browser does with a link.
 */
export function isPlainClick(event: Click): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

import type { Attachment } from 'svelte/attachments';

/**
 * Calls `onNear` once, the first time the element comes within a fifth of a screen below the fold. That's OG's
 * waypoint `offset: '120%'` for the lazy summary sections. Browsers without IntersectionObserver call it right away.
 */
export function nearViewport(onNear: () => void): Attachment<HTMLElement> {
  return (element) => {
    if (typeof IntersectionObserver === 'undefined') {
      onNear();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      onNear();
    }, { rootMargin: '0px 0px 20% 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  };
}

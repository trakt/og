import type { Attachment } from 'svelte/attachments';
import { activeSection } from './activeSection.ts';

/**
 * A scrollspy for a page's in-page nav (OG's Bootstrap `scrollspy`): calls `onchange` with the id of the section in
 * view as the window scrolls. A section counts as reached at its `scroll-margin-top`, the fixed header's height, so a
 * nav link lights up as soon as clicking it lands. Ids with no element on the page, or one that isn't rendered, are
 * skipped.
 */
export function scrollSpy(ids: readonly string[], onchange: (id: string | undefined) => void): Attachment {
  return () => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const elements = ids.flatMap((id) => {
        const element = document.getElementById(id);
        // A section hidden at this width (discover's showcase on phones) has no box to reach.
        return element && element.getClientRects().length > 0 ? [element] : [];
      });
      const first = elements.at(0);
      const root = document.documentElement;
      onchange(activeSection({
        sections: elements.map((element) => ({ id: element.id, top: element.getBoundingClientRect().top })),
        offset: first ? Number.parseFloat(getComputedStyle(first).scrollMarginTop) || 0 : 0,
        atBottom: elements.length > 1 && Math.ceil(root.scrollTop + root.clientHeight) >= root.scrollHeight,
      }));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
    };
  };
}

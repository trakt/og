import type { Attachment } from 'svelte/attachments';

export type BackgroundFlash = { color: 'purple' | 'red' };

export function backgroundFlash(
  flash: BackgroundFlash | Nil,
): Attachment<HTMLElement> {
  return (node) => {
    if (!flash) {
      return;
    }

    const clear = (event: AnimationEvent) => {
      if (event.animationName !== 'background-flash') {
        return;
      }

      delete node.dataset.backgroundFlash;
    };

    delete node.dataset.backgroundFlash;
    void node.offsetWidth;
    node.dataset.backgroundFlash = flash.color;
    node.addEventListener('animationend', clear);

    return () => {
      node.removeEventListener('animationend', clear);
      delete node.dataset.backgroundFlash;
    };
  };
}

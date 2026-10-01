import type { SubpageMedia } from './toSubpageMedia.ts';

/**
 * What the subpage frame needs about its item: a {@link SubpageMedia}, or a person's, which has no comments, Watch Now
 * or rating badges. The frame only reads the item's full title.
 */
export type SubpageFrameMedia = Omit<SubpageMedia, 'item'> & { readonly item: { readonly title: string } };

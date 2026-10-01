import type { toSearchImageType } from './toSearchImageType.ts';

/** poster, thumb, screenshot, fanart, logo or banner. */
export type SearchImageType = ReturnType<typeof toSearchImageType>;

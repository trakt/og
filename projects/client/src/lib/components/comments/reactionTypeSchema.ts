import { z } from 'zod/v4';

/** OG's seven choices, shared by the picker and the API viewer reaction parser. */
export const reactionTypeSchema = z.enum(['like', 'dislike', 'love', 'laugh', 'shocked', 'bravo', 'spoiler']);

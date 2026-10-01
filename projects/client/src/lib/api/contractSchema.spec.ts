import { commentResponseSchema } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { contractSchema } from './contractSchema.ts';

describe('contractSchema', () => {
  it('should reject bodies that fail the published contract', () => {
    const schema = contractSchema(commentResponseSchema.array());
    expect(schema.safeParse([{ id: 'bad' }]).success).toBe(false);
    expect(schema.parse([])).toEqual([]);
  });
});

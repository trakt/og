import { describe, expect, it } from 'vitest';
import { isIconFamily } from './isIconFamily.ts';

describe('isIconFamily', () => {
  it('should accept every family', () => {
    expect(['solid', 'regular', 'light', 'thin', 'brands', 'kit', 'trakt', 'logos'].every(isIconFamily)).toBe(true);
  });

  it('should reject anything else, including inherited object keys', () => {
    expect(['duotone', 'fa-thin', '', 'toString'].some(isIconFamily)).toBe(false);
  });
});

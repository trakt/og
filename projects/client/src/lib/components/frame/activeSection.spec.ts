import { describe, expect, it } from 'vitest';
import { activeSection } from './activeSection.ts';

const sections = (...tops: number[]) => tops.map((top, index) => ({ id: `s${index}`, top }));

describe('util: activeSection', () => {
  it('should pick the last section that has reached the offset', () => {
    expect(activeSection({ sections: sections(-900, -200, 300), offset: 65, atBottom: false })).toBe('s1');
  });

  it('should count a section sitting right under the header', () => {
    expect(activeSection({ sections: sections(65, 900), offset: 65, atBottom: false })).toBe('s0');
    expect(activeSection({ sections: sections(-600, 65.5), offset: 65, atBottom: false })).toBe('s1');
  });

  it('should pick none above the first section', () => {
    expect(activeSection({ sections: sections(200, 900), offset: 65, atBottom: false })).toBeUndefined();
  });

  it('should pick the last section at the bottom of the page', () => {
    expect(activeSection({ sections: sections(-900, -200, 300), offset: 65, atBottom: true })).toBe('s2');
  });

  it('should pick none without sections', () => {
    expect(activeSection({ sections: [], offset: 65, atBottom: true })).toBeUndefined();
  });
});

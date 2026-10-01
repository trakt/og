import { describe, expect, it } from 'vitest';
import { toVipBadge } from './toVipBadge.ts';

describe('toVipBadge', () => {
  it('should show nothing for a free account', () => {
    expect(toVipBadge({ vip: false })).toBeNull();
    expect(toVipBadge({})).toBeNull();
  });

  it('should show Director for staff, even when they are VIP', () => {
    expect(toVipBadge({ vip: true, vip_og: true, vip_years: 17, director: true })).toEqual({ kind: 'director' });
  });

  it('should tag an original VIP with OG before EP', () => {
    expect(toVipBadge({ vip: true, vip_og: true, vip_ep: true, vip_years: 1 })).toEqual({
      kind: 'vip',
      tag: { text: 'OG', title: 'Original VIP Member' },
      years: null,
    });
  });

  it('should tag an executive producer with EP', () => {
    expect(toVipBadge({ vip: true, vip_ep: true })).toEqual({
      kind: 'vip',
      tag: { text: 'EP', title: 'Executive Producer' },
      years: null,
    });
  });

  it('should only count years past the first', () => {
    expect(toVipBadge({ vip: true, vip_years: 1 })).toEqual({ kind: 'vip', tag: null, years: null });
    expect(toVipBadge({ vip: true, vip_years: 4 })).toEqual({ kind: 'vip', tag: null, years: 4 });
  });
});

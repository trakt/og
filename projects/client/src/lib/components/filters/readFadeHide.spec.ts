import { describe, expect, it } from 'vitest';
import { readFadeHide } from './readFadeHide.ts';

describe('readFadeHide', () => {
  it('should restore only supported page preferences', () => {
    const cookies = { get: (name: string) => name === 'filter-fade-show' ? 'watched,bogus' : 'rated' };
    expect(readFadeHide({ cookies, scope: 'show' })).toEqual({ fade: ['watched'], hide: ['rated'] });
  });
  it('should let explicit URL values override cookies, including Show All', () => {
    const cookies = { get: () => 'watched' };
    expect(readFadeHide({ cookies, scope: 'season', search: new URLSearchParams('fade=&hide=unrated') }))
      .toEqual({ fade: [], hide: ['unrated'] });
  });
});

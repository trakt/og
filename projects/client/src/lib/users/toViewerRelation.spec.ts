import { describe, expect, it } from 'vitest';
import { toViewerRelation, type ViewerLists } from './toViewerRelation.ts';

const row = (slug: string) => ({ user: { ids: { slug } } });
const empty: ViewerLists = { following: [], pending: [], followers: [], blocked: [], requests: [] };

describe('toViewerRelation', () => {
  it('should be a stranger when no list has them', () => {
    expect(toViewerRelation('sean', { ...empty, following: [row('justin')] })).toEqual({
      follow: 'none',
      followsYou: false,
      blocked: false,
      requestId: null,
    });
  });

  it('should prefer an approved follow over a pending one', () => {
    expect(toViewerRelation('sean', { ...empty, following: [row('sean')], pending: [row('sean')] }).follow)
      .toBe('following');
    expect(toViewerRelation('sean', { ...empty, pending: [row('sean')] }).follow).toBe('pending');
  });

  it('should see that they follow the viewer, or are blocked', () => {
    const relation = toViewerRelation('sean', { ...empty, followers: [row('sean')], blocked: [row('sean')] });

    expect(relation.followsYou).toBe(true);
    expect(relation.blocked).toBe(true);
  });

  it('should pick out their follow request', () => {
    const requests = [{ id: 7, ...row('justin') }, { id: 9, ...row('sean') }];

    expect(toViewerRelation('sean', { ...empty, requests }).requestId).toBe(9);
  });
});

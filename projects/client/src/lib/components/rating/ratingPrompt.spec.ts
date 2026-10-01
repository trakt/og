import { describe, expect, it } from 'vitest';
import { ratingPrompt } from './ratingPrompt.ts';

describe('ratingPrompt', () => {
  it('should ask when nothing is rated or previewed', () => {
    expect(ratingPrompt(null, null)).toEqual({ strong: '', text: 'What do you think?' });
  });

  it('should show the current rating at rest', () => {
    expect(ratingPrompt(9, null)).toEqual({ strong: '9', text: ' — Superb' });
  });

  it('should show the previewed rating over the current one', () => {
    expect(ratingPrompt(9, 1)).toEqual({ strong: '1', text: ' — Weak Sauce :(' });
    expect(ratingPrompt(null, 10)).toEqual({ strong: '10', text: ' — Totally Ninja!' });
  });

  it('should offer to unrate when previewing the current rating', () => {
    expect(ratingPrompt(7, 7)).toEqual({ strong: 'Unrate', text: '' });
  });
});

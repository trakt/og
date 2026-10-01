import { describe, expect, it } from 'vitest';
import { parseIconSvg } from './parseIconSvg.ts';

describe('parseIconSvg', () => {
  it('should read the viewBox and path data', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">' +
      '<path fill="currentColor" d="M0 448L256 448Z"/></svg>\n';

    expect(parseIconSvg(svg)).toEqual({ viewBox: '0 0 320 512', pathData: 'M0 448L256 448Z' });
  });

  it('should throw when the SVG has no path', () => {
    expect(() => parseIconSvg('<svg viewBox="0 0 1 1"></svg>')).toThrow('needs a viewBox and one path');
  });

  it('should throw when the SVG has no viewBox', () => {
    expect(() => parseIconSvg('<svg><path d="M0 0Z"/></svg>')).toThrow('needs a viewBox and one path');
  });
});

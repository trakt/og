import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import TraktLoader from './TraktLoader.svelte';
import TraktLoaderPair from './TraktLoaderPair.spec.svelte';

const clipIds = (html: string) => [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);

describe('component: TraktLoader', () => {
  it('should give each instance on a page its own clip id and point its fill at it', () => {
    const { body } = render(TraktLoaderPair);
    const ids = clipIds(body);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(body).toContain(`clip-path="url(#${id})"`);
  });

  it('should announce its label in a status region and hide the svg', () => {
    const { body } = render(TraktLoader, { props: { label: 'Loading your progress' } });

    expect(body).toMatch(/role="status"/);
    expect(body).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(body).toContain('Loading your progress');
  });

  it('should default its label and size', () => {
    const { body } = render(TraktLoader);

    expect(body).toContain('>Loading<');
    expect(body).toMatch(/<svg[^>]*width="64"[^>]*height="64"/);
  });

  it('should only force reduced motion when asked', () => {
    expect(render(TraktLoader).body).not.toContain('data-motion');
    expect(render(TraktLoader, { props: { reducedMotion: true } }).body).toContain('data-motion="reduce"');
  });
});

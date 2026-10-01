import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MediaSpoiler from './MediaSpoiler.svelte';
import FanartCard from '../media/FanartCard.svelte';
import { quickIconFill } from '../media/quickIconFill.ts';

const viewer = vi.hoisted(() => ({
  signedIn: true,
  mode: 'hide',
  watched: undefined as boolean | undefined,
}));
vi.mock('$app/state', () => ({
  page: {
    get data() {
      return {
        user: viewer.signedIn ? { slug: 'fixture' } : null,
        settings: { browsing: { spoilers: { episodes: viewer.mode, ratings: 'hide' } } },
      };
    },
  },
}));
vi.mock('$lib/overlay/overlay', () => ({
  overlay: { state: () => ({ watched: viewer.watched }), isHidden: () => false, watchlistCount: () => 0 },
}));

const content = createRawSnippet(() => ({ render: () => '<span>Episode spoiler</span>' }));
const html = (kind: 'title' | 'overview' | 'rating') =>
  render(MediaSpoiler, {
    props: { target: { type: 'episode', id: 1 }, kind, inline: true, children: content },
  }).body;

beforeEach(() => {
  viewer.signedIn = true;
  viewer.mode = 'hide';
  viewer.watched = undefined;
});

describe('MediaSpoiler', () => {
  it('should protect SSR content before the watched overlay arrives', () => {
    expect(html('overview')).toContain('aria-hidden="true"');
    expect(html('overview')).toContain('inert');
    expect(html('overview')).toContain('Click to reveal spoilers');
  });
  it('should reveal watched content without an extra control', () => {
    viewer.watched = true;
    expect(html('title')).not.toContain('Click to reveal spoilers');
    expect(html('title')).not.toContain('aria-hidden="true"');
  });
  it('should leave titles visible in overview-only mode while protecting ratings', () => {
    viewer.mode = 'hide_overviews';
    expect(html('title')).not.toContain('Click to reveal spoilers');
    expect(html('overview')).toContain('Click to reveal spoilers');
    expect(html('rating')).toContain('Click to reveal spoilers');
  });
  it('should show anonymous content regardless of leftover preferences', () => {
    viewer.signedIn = false;
    expect(html('title')).not.toContain('Click to reveal spoilers');
  });

  it('should substitute screenshot art while preserving safe episode posters', () => {
    const card = (image: string, spoilerImage?: string) =>
      render(FanartCard, {
        props: {
          href: '/shows/breaking-bad/seasons/1/episodes/1',
          title: 'Pilot',
          image,
          spoilerImage,
          icons: { fill: quickIconFill({ state: {} }), ratingTarget: { type: 'episode', id: 1, title: 'Pilot' } },
        },
      }).body;
    expect(card('https://media.trakt.tv/screenshots/pilot.jpg', 'https://media.trakt.tv/fanarts/show.jpg'))
      .not.toContain('src="https://media.trakt.tv/screenshots/pilot.jpg"');
    expect(card('https://media.trakt.tv/screenshots/pilot.jpg', 'https://media.trakt.tv/fanarts/show.jpg'))
      .toContain('src="https://media.trakt.tv/fanarts/show.jpg"');
    expect(card('https://media.trakt.tv/posters/show.jpg')).toContain('src="https://media.trakt.tv/posters/show.jpg"');
  });
});

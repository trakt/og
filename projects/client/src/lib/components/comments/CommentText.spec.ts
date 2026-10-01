import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import CommentText from './CommentText.svelte';
import { parseComment } from './text/parseComment.ts';

const html = (comment: string) => render(CommentText, { props: { blocks: parseComment(comment) } }).body;
// Svelte's hydration markers.
const clean = (markup: string) => markup.replace(/<!--[^>]*-->/g, '');

describe('CommentText', () => {
  it('should escape HTML and never render an event handler or script', () => {
    const markup = html('<script>alert(1)</script> <img src=x onerror=alert(1)> [x](javascript:alert(1))');

    const tags = [...clean(markup).matchAll(/<([a-z]+)/gi)].map(([, tag]) => tag);
    expect(new Set(tags)).toEqual(new Set(['div', 'p']));
    expect(markup).toContain('&lt;script>alert(1)&lt;/script>');
    expect(markup).not.toContain('href');
  });

  it('should keep attribute values quoted and escaped', () => {
    const markup = html('https://trakt.tv/x"onmouseover="alert(1)');

    const attributes = [...clean(markup).matchAll(/\s([a-z-]+)=/gi)].map(([, name]) => name);
    expect(attributes).not.toContain('onmouseover');
    expect(markup).toContain('href="https://trakt.tv/x"');
  });

  it('should put no whitespace between inline pieces', () => {
    expect(clean(html('**a**_b_ c `d`'))).toContain('<strong>a</strong>_b_ c <code>d</code>');
  });

  it('should render links, mentions and spoilers', () => {
    const markup = clean(html('@sean trakt.tv [spoiler]x[/spoiler]'));

    expect(markup).toContain('href="/users/sean"');
    expect(markup).toContain('href="http://trakt.tv/" target="_blank" rel="noopener noreferrer ugc"');
    expect(markup).toContain('Click to reveal spoilers');
  });

  it('should keep the spaces around an inline spoiler as typed', () => {
    const text = (comment: string) => clean(html(comment)).replace(/<[^>]+>/g, '');
    expect(text('a [spoiler]x[/spoiler] b')).toBe('a xClick to reveal spoilers b');
    expect(text('a [spoiler]x[/spoiler].')).toBe('a xClick to reveal spoilers.');
  });
});

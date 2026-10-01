import { describe, expect, it } from 'vitest';
import type { CommentInline } from './CommentInline.ts';
import { parseComment } from './parseComment.ts';

const text = (value: string): CommentInline => ({ type: 'text', text: value });
const paragraph = (...children: CommentInline[]) => ({ type: 'paragraph', children });
const link = (href: string, label = href): CommentInline => ({ type: 'link', href, children: [text(label)] });

// Every string that can reach the page, depth first: text, code, hrefs, usernames.
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('util: parseComment', () => {
  describe('for blocks', () => {
    it('should split paragraphs on blank lines and hard-wrap single newlines', () => {
      expect(parseComment('one\ntwo\n\nthree')).toEqual([
        paragraph(text('one'), { type: 'break' }, text('two')),
        paragraph(text('three')),
      ]);
    });

    it('should trim the comment and normalize Windows line endings', () => {
      expect(parseComment('  \r\nhi\r\nthere  \r\n')).toEqual([
        paragraph(text('hi'), { type: 'break' }, text('there')),
      ]);
    });

    it('should return nothing for an empty or GIF-only comment', () => {
      expect(parseComment('   ')).toEqual([]);
    });

    it('should read `>` lines as a quote, with lazy continuation lines', () => {
      expect(parseComment('> quoted\nstill quoted\n\nafter')).toEqual([
        { type: 'quote', children: [paragraph(text('quoted'), { type: 'break' }, text('still quoted'))] },
        paragraph(text('after')),
      ]);
    });

    it('should nest quotes', () => {
      expect(parseComment('> > deep')).toEqual([
        { type: 'quote', children: [{ type: 'quote', children: [paragraph(text('deep'))] }] },
      ]);
    });

    it('should end a paragraph at a quote', () => {
      expect(parseComment('text\n>quote')).toEqual([
        paragraph(text('text')),
        { type: 'quote', children: [paragraph(text('quote'))] },
      ]);
    });

    it('should need a space after `#` for a heading', () => {
      expect(parseComment('# Title #\n#hashtag')).toEqual([
        { type: 'heading', level: 1, children: [text('Title')] },
        paragraph(text('#hashtag')),
      ]);
    });

    it('should read setext underlines as headings before rules', () => {
      expect(parseComment('intro\nTitle\n---\nbody')).toEqual([
        paragraph(text('intro')),
        { type: 'heading', level: 2, children: [text('Title')] },
        paragraph(text('body')),
      ]);
    });

    it('should read a rule', () => {
      expect(parseComment('a\n\n* * *\n\nb')).toEqual([paragraph(text('a')), { type: 'rule' }, paragraph(text('b'))]);
    });

    it('should read lists, but not when they follow text without a blank line', () => {
      expect(parseComment('- one\n- two\n\n1. first')).toEqual([
        { type: 'list', ordered: false, items: [[text('one')], [text('two')]] },
        { type: 'list', ordered: true, items: [[text('first')]] },
      ]);
      expect(parseComment('Pros:\n- acting')).toEqual([paragraph(text('Pros:'), { type: 'break' }, text('- acting'))]);
    });

    it('should keep indented code verbatim, except at the very start, which OG trimmed', () => {
      expect(parseComment('    **bold**')).toEqual([paragraph({ type: 'strong', children: [text('bold')] })]);
      expect(parseComment('intro\n\n    **not bold** <b>\n\nafter')).toEqual([
        paragraph(text('intro')),
        { type: 'code', text: '**not bold** <b>' },
        paragraph(text('after')),
      ]);
    });

    it('should style a paragraph that starts with ~1 to ~6 as an author paragraph', () => {
      expect(parseComment('~3 Vince Gilligan\n\n~7 no')).toEqual([
        { type: 'paragraph', author: 3, children: [text(' Vince Gilligan')] },
        paragraph(text('~7 no')),
      ]);
    });
  });

  describe('for inline formatting', () => {
    it('should read bold, italics, strike, highlight and code', () => {
      expect(parseComment('**b** _i_ ~~s~~ ==h== `c`')).toEqual([
        paragraph(
          { type: 'strong', children: [text('b')] },
          text(' '),
          { type: 'em', children: [text('i')] },
          text(' '),
          { type: 'del', children: [text('s')] },
          text(' '),
          { type: 'mark', children: [text('h')] },
          text(' '),
          { type: 'code', text: 'c' },
        ),
      ]);
    });

    it('should read triple emphasis as bold italics and nest emphasis', () => {
      expect(parseComment('***both*** **a _b_**')).toEqual([
        paragraph(
          { type: 'strong', children: [{ type: 'em', children: [text('both')] }] },
          text(' '),
          { type: 'strong', children: [text('a '), { type: 'em', children: [text('b')] }] },
        ),
      ]);
    });

    it('should not emphasize inside words', () => {
      expect(parseComment('snake_case_name and 2*3*4')).toEqual([paragraph(text('snake_case_name and 2*3*4'))]);
    });

    it('should not open emphasis before a space or close it after one', () => {
      expect(parseComment('a * b * c and **x **')).toEqual([paragraph(text('a * b * c and **x **'))]);
    });

    it('should keep single tildes and equals signs as text', () => {
      expect(parseComment('~approx =equal=')).toEqual([paragraph(text('~approx =equal='))]);
    });

    it('should not format inside code spans', () => {
      expect(parseComment('``a `**b**` c``')).toEqual([paragraph({ type: 'code', text: 'a `**b**` c' })]);
    });

    it('should honour backslash escapes', () => {
      expect(parseComment('\\*not em\\*')).toEqual([paragraph(text('*not em*'))]);
    });

    it('should leave an unclosed delimiter as text', () => {
      expect(parseComment('**open `tick')).toEqual([paragraph(text('**open `tick'))]);
    });
  });

  describe('for links and mentions', () => {
    it('should link allowlisted URLs with or without a scheme, dropping trailing punctuation', () => {
      expect(parseComment('See https://trakt.tv/shows/the-boys-2019. Or imdb.com/title/tt1190634!')).toEqual([
        paragraph(
          text('See '),
          link('https://trakt.tv/shows/the-boys-2019', 'https://trakt.tv/shows/the-boys-2019'),
          text('. Or '),
          link('http://imdb.com/title/tt1190634', 'imdb.com/title/tt1190634'),
          text('!'),
        ),
      ]);
    });

    it('should keep other hosts, look-alikes and subdomains off the allowlist as text', () => {
      const blocks = parseComment('https://evil.com https://trakt.tv.evil.com https://m.imdb.com/x eviltrakt.tv');
      expect(blocks).toEqual([
        paragraph(text('https://evil.com https://trakt.tv.evil.com https://m.imdb.com/x eviltrakt.tv')),
      ]);
    });

    it('should drop credentials, ports and fragments from the href', () => {
      expect(parseComment('https://user:pass@trakt.tv:8080/x?y=1#z')).toEqual([
        paragraph(text('https://user:pass@trakt.tv:8080/x?y=1#z')),
      ]);
      expect(parseComment('https://trakt.tv:8080/x?y=1#z')).toEqual([
        paragraph(link('https://trakt.tv/x?y=1', 'https://trakt.tv:8080/x?y=1#z')),
      ]);
    });

    it('should turn markdown links to allowlisted hosts into links, and leave the rest as typed', () => {
      expect(parseComment('[the **show**](https://trakt.tv/shows/x) [bad](https://macrumors.com)')).toEqual([
        paragraph(
          {
            type: 'link',
            href: 'https://trakt.tv/shows/x',
            children: [text('the '), { type: 'strong', children: [text('show')] }],
          },
          text(' [bad](https://macrumors.com)'),
        ),
      ]);
    });

    it('should mark YouTube links with their video id', () => {
      expect(parseComment('https://youtu.be/dQw4w9WgXcQ https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1')).toEqual([
        paragraph(
          {
            type: 'link',
            href: 'https://youtu.be/dQw4w9WgXcQ',
            video: 'dQw4w9WgXcQ',
            children: [text('https://youtu.be/dQw4w9WgXcQ')],
          },
          text(' '),
          {
            type: 'link',
            href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1',
            video: 'dQw4w9WgXcQ',
            children: [text('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1')],
          },
        ),
      ]);
    });

    it('should link @mentions, but not email addresses', () => {
      expect(parseComment('@sean_rudford, hi. me@trakt.tv')).toEqual([
        paragraph({ type: 'mention', username: 'sean_rudford' }, text(', hi. me@trakt.tv')),
      ]);
    });

    it('should not emphasize underscores inside a linked URL', () => {
      expect(parseComment('https://trakt.tv/users/_a_')).toEqual([paragraph(link('https://trakt.tv/users/_a_'))]);
    });
  });

  describe('for emoji', () => {
    it('should turn JoyPixels shortnames into emoji and leave unknown ones as text', () => {
      expect(parseComment(':joy: :+1: :thumbsup_tone3: :not_an_emoji: 10:30:00')).toEqual([
        paragraph(
          { type: 'emoji', emoji: '😂', shortname: ':joy:' },
          text(' '),
          { type: 'emoji', emoji: '👍', shortname: ':+1:' },
          text(' '),
          { type: 'emoji', emoji: '👍🏽', shortname: ':thumbsup_tone3:' },
          text(' :not_an_emoji: 10:30:00'),
        ),
      ]);
    });
  });

  describe('for inline spoilers', () => {
    it('should wrap balanced spoiler tags, whatever their case', () => {
      expect(parseComment('He [SPOILER]dies[/Spoiler].')).toEqual([
        paragraph(text('He '), { type: 'spoiler', children: [text('dies')] }, text('.')),
      ]);
    });

    it('should leave the tags as text when they are unbalanced', () => {
      expect(parseComment('[spoiler]a [spoiler]b[/spoiler]')).toEqual([
        paragraph(text('[spoiler]a [spoiler]b[/spoiler]')),
      ]);
    });

    it('should run a spoiler on into the next paragraph, like OG', () => {
      expect(parseComment('[spoiler]one\n\ntwo[/spoiler] three')).toEqual([
        paragraph({ type: 'spoiler', children: [text('one')] }),
        paragraph({ type: 'spoiler', children: [text('two')] }, text(' three')),
      ]);
    });

    it('should drop a closing tag that comes first', () => {
      expect(parseComment('[/spoiler]a[spoiler]b')).toEqual([
        paragraph(text('a'), { type: 'spoiler', children: [text('b')] }),
      ]);
    });

    it('should format inside spoilers', () => {
      expect(parseComment('[spoiler]x _y_[/spoiler]')).toEqual([
        paragraph({ type: 'spoiler', children: [text('x '), { type: 'em', children: [text('y')] }] }),
      ]);
    });
  });

  describe('for hostile input', () => {
    it('should keep HTML as text', () => {
      expect(parseComment('<script>alert(1)</script><img src=x onerror=alert(1)>')).toEqual([
        paragraph(text('<script>alert(1)</script><img src=x onerror=alert(1)>')),
      ]);
    });

    it('should never make a link from a javascript: or data: URL', () => {
      const blocks = parseComment(
        '[x](javascript:alert(1)) [y](data:text/html,hi) javascript:alert(1) [z](JAVASCRIPT://trakt.tv/%0aalert(1))',
      );
      expect(JSON.stringify(blocks)).not.toContain('"link"');
    });

    it('should never put anything but an http(s) allowlisted href in a link', () => {
      const blocks = parseComment(
        'https://trakt.tv/"onmouseover="alert(1) [a](https://trakt.tv/x"><script>) https://trakt.tv/<b>',
      );
      const hrefs = JSON.stringify(blocks).match(/"href":"[^"]*"/g) ?? [];
      expect(hrefs.length).toBeGreaterThan(0);
      hrefs.forEach((href) => expect(href).toMatch(/^"href":"https:\/\/trakt\.tv\/[^"<>\s]*"$/));
    });

    it('should keep mention usernames to word characters', () => {
      const blocks = parseComment('@a"><img @../../settings @x/y');
      const usernames = strings(blocks).filter((value) => value !== 'mention');
      expect(JSON.stringify(blocks).match(/"username":"[^"]*"/g)).toEqual(['"username":"a"', '"username":"x"']);
      expect(usernames.join('')).toContain('"><img');
    });

    it('should parse very long and deeply nested input without blowing the stack', () => {
      const long = 'word **bold** _it_ https://trakt.tv/x @user :joy: '.repeat(2000);
      expect(() => parseComment(long)).not.toThrow();
      expect(() => parseComment('>'.repeat(500) + ' deep')).not.toThrow();
      expect(() => parseComment('**'.repeat(5000))).not.toThrow();
    });
  });
});

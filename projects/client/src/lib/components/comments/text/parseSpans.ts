import type { CommentInline } from './CommentInline.ts';
import { emojiFor } from './emojiFor.ts';
import { safeLink } from './safeLink.ts';

// Redcarpet's escapable characters: `\*` is a literal star.
const ESCAPABLE = new Set('\\`*_{}[]()#+-.!:|&<>^~='.split(''));

// A URL's host, port, path and query, with or without a scheme. The host is checked against the allowlist afterwards.
const URL_AT = /(?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s<>"]*)?/iy;
// twitter-text: a URL can't follow a letter, digit, `@`, `$` or `#`, or sit inside another host or path.
const URL_BOUNDARY = /[\w@$#./-]/;
// twitter-text's mention: `@` and 1 to 20 word characters, not after a word character or one of `!#$%&*@`.
const MENTION_AT = /@(\w{1,20})(?![\w@])/y;
const MENTION_BOUNDARY = /[\w!#$%&*@]/;
const EMOJI_AT = /:([a-z0-9_+-]+):/y;
// No-intra-emphasis: an opening delimiter only counts after whitespace, `>` or `(` (Redcarpet `char_emphasis`).
const EMPHASIS_OPENER = /[\s>(]/;

const EMPHASIS: Record<string, Partial<Record<1 | 2 | 3, 'em' | 'strong' | 'strong-em' | 'del' | 'mark'>>> = {
  '*': { 1: 'em', 2: 'strong', 3: 'strong-em' },
  _: { 1: 'em', 2: 'strong', 3: 'strong-em' },
  '~': { 2: 'del' },
  '=': { 2: 'mark' },
};

type Match = { readonly nodes: readonly CommentInline[]; readonly end: number };

const isSpace = (char: string | undefined) => char !== undefined && /\s/.test(char);
const isAlnum = (char: string | undefined) => char !== undefined && /[a-z0-9]/i.test(char);

const run = (src: string, at: number, char: string) => {
  const match = new RegExp(`\\${char}+`, 'y');
  match.lastIndex = at;
  return match.exec(src)?.[0].length ?? 0;
};

/** A `` `code` `` span: the closing run has the same number of backticks. */
function codeAt(src: string, at: number): Match | undefined {
  const ticks = run(src, at, '`');
  const fence = '`'.repeat(ticks);
  const find = (from: number): number => {
    const close = src.indexOf(fence, from);
    if (close === -1) return -1;
    return run(src, close, '`') === ticks ? close : find(close + run(src, close, '`'));
  };

  const close = find(at + ticks);
  if (close === -1) return undefined;

  const text = src.slice(at + ticks, close).trim();
  return { nodes: [{ type: 'code', text }], end: close + ticks };
}

/**
 * Where the closing delimiter is (Redcarpet `parse_emph1` and `parse_emph2`): not after whitespace, not before a letter
 * or digit, and outside code spans. A single delimiter skips doubled ones.
 */
function closingAt(src: string, from: number, delimiter: string): number {
  let at = from;
  while (at < src.length) {
    const code = src[at] === '`' ? codeAt(src, at) : undefined;
    if (code) {
      at = code.end;
      continue;
    }

    const found = src.startsWith(delimiter, at);
    const doubled = delimiter.length === 1 && src[at + 1] === delimiter;
    if (found && doubled) {
      at += 2;
      continue;
    }
    if (found && !isSpace(src[at - 1]) && !isAlnum(src[at + delimiter.length])) return at;
    at += 1;
  }
  return -1;
}

function emphasisAt(src: string, at: number): Match | undefined {
  const char = src[at] ?? '';
  const length = run(src, at, char);
  if (length > 3) return undefined;

  const kind = EMPHASIS[char]?.[length as 1 | 2 | 3];
  if (!kind || isSpace(src[at + length]) || at + length >= src.length) return undefined;

  const delimiter = char.repeat(length);
  const close = closingAt(src, at + length, delimiter);
  if (close === -1 || close === at + length) return undefined;

  const children = parseSpans(src.slice(at + length, close));
  const node: CommentInline = kind === 'strong-em'
    ? { type: 'strong', children: [{ type: 'em', children }] }
    : { type: kind, children };
  return { nodes: [node], end: close + length };
}

/** `[text](url)`: only a link when the URL is allowlisted. Anything else stays as typed, brackets and all. */
function markdownLinkAt(src: string, at: number): Match | undefined {
  const match = /\[([^\]\n]+)\]\(([^()\s]+)\)/y;
  match.lastIndex = at;
  const found = match.exec(src);
  const link = found?.[2] ? safeLink(found[2]) : undefined;
  if (!found || !link) return undefined;

  return { nodes: [{ type: 'link', ...link, children: parseSpans(found[1] ?? '') }], end: at + found[0].length };
}

// twitter-text drops trailing punctuation, and a closing paren that has no opening one in the URL.
function trimUrl(url: string): string {
  const trimmed = url.replace(/[^\w=#/+)-]+$/, '');
  const unbalanced = trimmed.endsWith(')') && trimmed.split('(').length < trimmed.split(')').length;
  return unbalanced ? trimUrl(trimmed.slice(0, -1)) : trimmed;
}

function urlAt(src: string, at: number): Match | undefined {
  URL_AT.lastIndex = at;
  const found = URL_AT.exec(src)?.[0];
  if (!found) return undefined;

  const url = trimUrl(found);
  const link = safeLink(url);
  if (!link) return undefined;

  return { nodes: [{ type: 'link', ...link, children: [{ type: 'text', text: url }] }], end: at + url.length };
}

function mentionAt(src: string, at: number): Match | undefined {
  MENTION_AT.lastIndex = at;
  const username = MENTION_AT.exec(src)?.[1];
  return username ? { nodes: [{ type: 'mention', username }], end: at + username.length + 1 } : undefined;
}

function emojiAt(src: string, at: number): Match | undefined {
  EMOJI_AT.lastIndex = at;
  const found = EMOJI_AT.exec(src);
  const emoji = found?.[1] ? emojiFor(found[1]) : undefined;
  return found && emoji
    ? { nodes: [{ type: 'emoji', emoji, shortname: found[0] }], end: at + found[0].length }
    : undefined;
}

function spanAt(src: string, at: number, previous: string | undefined): Match | undefined {
  const char = src[at];
  const next = src[at + 1];

  if (char === '\\' && next !== undefined && ESCAPABLE.has(next)) {
    return { nodes: [{ type: 'text', text: next }], end: at + 2 };
  }
  if (char === '\n') return { nodes: [{ type: 'break' }], end: at + 1 };
  if (char === '`') return codeAt(src, at);
  if (char && char in EMPHASIS && (previous === undefined || EMPHASIS_OPENER.test(previous))) {
    return emphasisAt(src, at);
  }
  if (char === '[') return markdownLinkAt(src, at);
  if (char === '@' && !(previous && MENTION_BOUNDARY.test(previous))) return mentionAt(src, at);
  if (char === ':') return emojiAt(src, at);
  if (previous && URL_BOUNDARY.test(previous)) return undefined;
  return /[a-z0-9]/i.test(char ?? '') ? urlAt(src, at) : undefined;
}

/**
 * Parses one run of inline comment text: Redcarpet's emphasis, strike, highlight and code spans with no-intra-emphasis
 * and hard wraps, then the allowlisted links, `@mentions` and `:emoji:` codes OG added on top. `previous` is the
 * character before the run, which decides whether emphasis can open at its start.
 */
export function parseSpans(src: string, previous?: string): readonly CommentInline[] {
  // A loop, not recursion: comments can run to thousands of characters.
  const nodes: CommentInline[] = [];
  const push = (node: CommentInline) => {
    const last = nodes.at(-1);
    if (node.type === 'text' && last?.type === 'text') {
      nodes[nodes.length - 1] = { type: 'text', text: last.text + node.text };
    } else nodes.push(node);
  };

  let at = 0;
  while (at < src.length) {
    const match = spanAt(src, at, at === 0 ? previous : src[at - 1]);
    if (match) {
      match.nodes.forEach(push);
      at = match.end;
      continue;
    }

    push({ type: 'text', text: src[at] ?? '' });
    at += 1;
  }
  return nodes;
}

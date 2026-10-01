import type { CommentBlock } from './CommentBlock.ts';
import type { CommentInline } from './CommentInline.ts';
import { parseSpans } from './parseSpans.ts';

// Blocks before their inline text is parsed.
type RawBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'quote'; children: RawBlock[] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'rule' };

const BLANK = /^\s*$/;
const QUOTE = /^ {0,3}> ?/;
const ATX_HEADING = /^(#{1,6}) +(.*?)(?: +#+)? *$/;
const RULE = /^ {0,3}(?:(?:\* *){3,}|(?:- *){3,}|(?:_ *){3,})$/;
const SETEXT = /^(=+|-+) *$/;
const LIST_ITEM = /^ {0,3}(?:([*+-])|\d+\.) +(.*)$/;
const CODE = /^ {4}/;
const AUTHOR = /^~([1-6])/;
const SPOILER_TAG = /\[(\/?)spoiler\]/gi;

const isBlank = (line: string) => BLANK.test(line);

// A paragraph ends at a blank line, a quote, a heading or a rule. Lists and code blocks can't interrupt one (Redcarpet
// without lax spacing), so a line starting "- " after text stays in the paragraph as a hard-wrapped line.
const endsParagraph = (line: string) => isBlank(line) || QUOTE.test(line) || ATX_HEADING.test(line) || RULE.test(line);

function takeWhile(lines: readonly string[], from: number, keep: (line: string, at: number) => boolean): number {
  let at = from;
  while (at < lines.length && keep(lines[at] ?? '', at)) at += 1;
  return at;
}

function quoteAt(lines: readonly string[], from: number): [RawBlock, number] {
  // Lazy continuation: unprefixed lines stay in the quote until a blank line that isn't followed by another `>` line.
  const end = takeWhile(lines, from, (line, at) => !isBlank(line) || QUOTE.test(lines[at + 1] ?? ''));
  const inner = lines.slice(from, end).map((line) => line.replace(QUOTE, ''));
  return [{ type: 'quote', children: parseBlocks(inner) }, end];
}

function codeAt(lines: readonly string[], from: number): [RawBlock, number] {
  const end = takeWhile(lines, from, (line) => CODE.test(line) || isBlank(line));
  const body = lines.slice(from, end).map((line) => line.replace(CODE, ''));
  const trailingBlanks = body.length - takeWhile([...body].reverse(), 0, isBlank);
  return [{ type: 'code', text: body.slice(0, trailingBlanks).join('\n') }, end];
}

function listAt(lines: readonly string[], from: number): [RawBlock, number] {
  const first = LIST_ITEM.exec(lines[from] ?? '');
  const ordered = !first?.[1];
  const sameKind = (line: string) => {
    const item = LIST_ITEM.exec(line);
    return item !== null && !item[1] === ordered;
  };

  const items: string[][] = [];
  let at = from;
  while (at < lines.length) {
    const line = lines[at] ?? '';
    const next = lines[at + 1] ?? '';
    if (sameKind(line)) items.push([LIST_ITEM.exec(line)?.[2] ?? '']);
    else if (LIST_ITEM.test(line)) break;
    else if (isBlank(line) && !sameKind(next) && !/^\s+\S/.test(next)) break;
    else if (!isBlank(line)) items.at(-1)?.push(line.trim());
    at += 1;
  }
  return [{ type: 'list', ordered, items: items.map((item) => item.join('\n')) }, at];
}

function paragraphAt(lines: readonly string[], from: number): [RawBlock[], number] {
  // Redcarpet checks for a setext underline before anything else, so `---` under text is a heading, not a rule.
  const end = takeWhile(lines, from + 1, (line) => !SETEXT.test(line) && !endsParagraph(line));
  const body = lines.slice(from, end);
  const underline = lines[end] ?? '';
  if (!SETEXT.test(underline)) return [[{ type: 'paragraph', text: body.join('\n') }], end];

  // The underline turns the line above it into a heading. The lines before that stay a paragraph.
  const before: RawBlock[] = body.length > 1 ? [{ type: 'paragraph', text: body.slice(0, -1).join('\n') }] : [];
  const heading: RawBlock = { type: 'heading', level: underline.startsWith('=') ? 1 : 2, text: body.at(-1) ?? '' };
  return [[...before, heading], end + 1];
}

function blockAt(lines: readonly string[], at: number): [RawBlock[], number] {
  const line = lines[at] ?? '';
  const heading = ATX_HEADING.exec(line);

  if (QUOTE.test(line)) return wrap(quoteAt(lines, at));
  if (heading) {
    const level = (heading[1]?.length ?? 1) as 1 | 2 | 3 | 4 | 5 | 6;
    return [[{ type: 'heading', level, text: heading[2] ?? '' }], at + 1];
  }
  if (RULE.test(line)) return [[{ type: 'rule' }], at + 1];
  if (CODE.test(line)) return wrap(codeAt(lines, at));
  if (LIST_ITEM.test(line)) return wrap(listAt(lines, at));
  return paragraphAt(lines, at);
}

const wrap = ([block, end]: [RawBlock, number]): [RawBlock[], number] => [[block], end];

function parseBlocks(lines: readonly string[]): RawBlock[] {
  const blocks: RawBlock[] = [];
  let at = 0;
  while (at < lines.length) {
    if (isBlank(lines[at] ?? '')) {
      at += 1;
      continue;
    }
    const [found, end] = blockAt(lines, at);
    blocks.push(...found);
    at = end;
  }
  return blocks;
}

/**
 * Inline text with `[spoiler]` tags. The tags only count when the comment has as many openings as closings, like OG.
 * `depth` is how many spoilers are still open from earlier blocks: OG swapped the tags for `<span>`s in the rendered
 * HTML, so a spoiler opened in one paragraph ran on into the next. A stray closing tag is dropped, as the browser did.
 */
function inlines(text: string, depth: number, spoilers: boolean): [readonly CommentInline[], number] {
  if (!spoilers) return [parseSpans(text), depth];

  type Open = { children: CommentInline[] };
  const root: Open = { children: [] };
  const stack: Open[] = [root];
  const open = () => {
    const spoiler: Open = { children: [] };
    stack.at(-1)?.children.push({ type: 'spoiler', children: spoiler.children });
    stack.push(spoiler);
  };
  Array.from({ length: depth }).forEach(open);

  const parts = text.split(SPOILER_TAG);
  // split() with one capture group alternates text, tag, text, tag: "" is an opening tag and "/" a closing one.
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      // Right after a tag, the previous character is its `]`, so emphasis can't open there (as in OG).
      stack.at(-1)?.children.push(...parseSpans(part, i === 0 ? undefined : ']'));
      return;
    }
    if (part === '') open();
    else if (stack.length > 1) stack.pop();
  });

  return [root.children, stack.length - 1];
}

function toBlocks(raw: readonly RawBlock[], depth: number, spoilers: boolean): [CommentBlock[], number] {
  const blocks: CommentBlock[] = [];
  let open = depth;
  const text = (source: string) => {
    const [children, after] = inlines(source, open, spoilers);
    open = after;
    return children;
  };

  raw.forEach((block) => {
    if (block.type === 'paragraph') {
      const author = AUTHOR.exec(block.text)?.[1];
      blocks.push(
        author
          ? { type: 'paragraph', author: Number(author), children: text(block.text.slice(2)) }
          : { type: 'paragraph', children: text(block.text) },
      );
    } else if (block.type === 'heading') {
      blocks.push({ type: 'heading', level: block.level, children: text(block.text) });
    } else if (block.type === 'quote') {
      const [children, after] = toBlocks(block.children, open, spoilers);
      open = after;
      blocks.push({ type: 'quote', children });
    } else if (block.type === 'list') {
      blocks.push({ type: 'list', ordered: block.ordered, items: block.items.map(text) });
    } else {
      blocks.push(block);
    }
  });

  return [blocks, open];
}

const count = (text: string, tag: string) => text.split(tag).length - 1;

/**
 * Turns a comment's text into blocks the way OG's comment rendering did: Redcarpet with hard wraps, no
 * intra-emphasis, strikethrough and highlight, no raw HTML, links or images, then OG's allowlisted links, mentions and
 * inline spoilers. Raw HTML stays as the text it was typed as. Nothing here produces markup: the component renders the
 * tree with Svelte, which escapes every string.
 */
export function parseComment(comment: string): readonly CommentBlock[] {
  const text = comment.trim().replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
  if (!text) return [];

  const lower = text.toLowerCase();
  const spoilers = lower.includes('[spoiler]') && count(lower, '[spoiler]') === count(lower, '[/spoiler]');
  return toBlocks(parseBlocks(text.split('\n')), 0, spoilers)[0];
}

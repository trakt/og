import type { CommentResponse, ReactionsSummaryResponse } from '@trakt/api';
import type { CommentItem } from '../../../lib/components/comments/CommentItem.ts';
import type { CommentsClient } from '../../../lib/components/comments/commentsClient.ts';

// Made-up comments, so the demo and its screenshots never show a real member's words.
const PLACEHOLDERS = 'https://media.trakt.tv/hotlink-ok/placeholders/medium';

type User = CommentResponse['user'];
const member = (slug: string, name: string, extra: Partial<User> = {}): User => ({
  username: slug,
  private: false,
  deleted: false,
  name,
  vip: false,
  vip_ep: false,
  director: false,
  ids: { slug, trakt: slug.length },
  images: { avatar: { full: `${PLACEHOLDERS}/${extra.vip ? 'leela' : 'fry'}.png` } },
  ...extra,
});

const comment = (overrides: Partial<CommentResponse> & Pick<CommentResponse, 'id' | 'comment' | 'user'>) => ({
  parent_id: 0,
  created_at: '2026-09-19T19:16:00.000Z',
  updated_at: '2026-09-19T19:16:00.000Z',
  spoiler: false,
  review: false,
  replies: 0,
  likes: 0,
  user_rating: null,
  user_stats: { rating: null, play_count: 1, completed_count: 1 },
  ...overrides,
});

const paragraph = (topic: string) =>
  `The ${topic} is where this one earns its runtime. Every scene is built with care, the pacing never drags, and ` +
  `the performances carry the quieter moments as well as the loud ones. It rewards a second watch, and the details ` +
  `you catch the second time make the first feel even better in hindsight.`;

export const movie: CommentItem = { type: 'movie', id: 1, title: 'Heat (1995)' };
export const show: CommentItem = { type: 'show', id: 2, title: 'Breaking Bad', airedEpisodes: 62 };
export const episode: CommentItem = { type: 'episode', id: 3, title: 'Breaking Bad 5x16 "Felina"', show: 2, season: 5 };

export const review = comment({
  id: 101,
  review: true,
  replies: 2,
  likes: 28,
  user_rating: 8,
  user_stats: { rating: 8, play_count: 2, completed_count: 1 },
  user: member('sample_reviewer', 'Sample Reviewer'),
  comment: [
    'A crime movie that actually understands what makes the genre work.',
    ...[
      'direction',
      'score',
      'cast',
      'editing',
      'cinematography',
      'ending',
    ].map(paragraph),
  ].join('\n\n'),
});

export const formatting = comment({
  id: 102,
  created_at: '2026-09-20T18:04:00.000Z',
  updated_at: '2026-09-28T09:30:00.000Z',
  user_rating: 9,
  user_stats: { rating: 9, play_count: 70, completed_count: 62 },
  user: member('og_tester', 'OG Tester', { vip: true, vip_ep: true }),
  comment: [
    'Paragraphs and hard line breaks,\nlike this one.',
    '**Bold**, _italics_, ~~strike~~, ==highlight== and `code`. ***Both*** at once, and snake_case_stays_plain.',
    '> A quote from the show.\n> > And one inside it.',
    '~1 An author paragraph, with its coloured rule.',
    'Links for trakt.tv/shows/breaking-bad and [the IMDb page](https://www.imdb.com/title/tt0903747/), a video at ' +
    'https://www.youtube.com/watch?v=HhesaQXLuRY, but not https://example.com or [this](https://example.com).',
    'Hi @og_tester :wave: :thumbsup_tone3: The ending: [spoiler]the finale has a twist[/spoiler].',
    // Split, or the demo's own <script> block would end here.
    `<${'script'}>alert("HTML stays text")</${'script'}> <b>not bold</b>`,
  ].join('\n\n'),
});

export const spoiler = comment({
  id: 103,
  spoiler: true,
  review: true,
  likes: 10,
  user_rating: 10,
  user_stats: { rating: 10, play_count: 1, completed_count: 1 },
  user: member('spoiler_fan', 'Spoiler Fan', { vip: true }),
  comment: ['What a way to end it.', ...['finale', 'last act', 'final shot', 'music', 'writing'].map(paragraph)].join(
    '\n\n',
  ),
});

export const inline = comment({
  id: 104,
  likes: 8,
  user: member('careful_viewer', 'Careful Viewer'),
  comment:
    'Ok ok, we are back on track. [spoiler]The lab scene at the end changes everything.[/spoiler] Great episode.',
});

export const staff = comment({
  id: 105,
  review: true,
  replies: 1,
  likes: 19,
  user_rating: 2,
  user_stats: { rating: 2, play_count: 1, completed_count: 1 },
  user: member('trakt_staff', 'Trakt Staff', { director: true, vip: true }),
  comment: paragraph('twist'),
});

export const deleted = comment({
  id: 106,
  created_at: '2026-09-20T18:04:00.000Z',
  updated_at: '2026-09-28T09:30:00.000Z',
  user_stats: { rating: null, play_count: 0, completed_count: 0 },
  user: member('gone', 'Gone', { deleted: true, ids: { slug: null, trakt: 6 }, images: null }),
  comment: 'A comment from a member who has since left.',
});

const replies: readonly CommentResponse[] = [
  comment({
    id: 201,
    parent_id: 101,
    created_at: '2026-09-26T23:18:00.000Z',
    updated_at: '2026-09-26T23:18:00.000Z',
    likes: 1,
    user_rating: 8,
    user_stats: { rating: 8, play_count: 1, completed_count: 1 },
    user: member('second_opinion', 'Second Opinion'),
    comment: '@sample_reviewer I completely agree with you.\n\nThe only letdown was the ending.',
  }),
  comment({
    id: 202,
    parent_id: 101,
    created_at: '2026-09-27T08:00:00.000Z',
    updated_at: '2026-09-27T08:00:00.000Z',
    user: member('sample_reviewer', 'Sample Reviewer'),
    comment: '@second_opinion Fair, it could have been tighter.',
  }),
];
export const reply = replies[0] as CommentResponse;

const summaries: Record<number, ReactionsSummaryResponse> = {
  101: {
    reaction_count: 28,
    user_count: 28,
    distribution: { like: 18, dislike: 4, love: 5, laugh: 1, shocked: 0, bravo: 0, spoiler: 0 },
  },
  103: {
    reaction_count: 10,
    user_count: 10,
    distribution: { like: 9, dislike: 1, love: 0, laugh: 0, shocked: 0, bravo: 0, spoiler: 0 },
  },
  104: {
    reaction_count: 8,
    user_count: 8,
    distribution: { like: 7, dislike: 0, love: 1, laugh: 0, shocked: 0, bravo: 0, spoiler: 0 },
  },
  105: {
    reaction_count: 19,
    user_count: 19,
    distribution: { like: 15, dislike: 4, love: 0, laugh: 0, shocked: 0, bravo: 0, spoiler: 0 },
  },
  201: {
    reaction_count: 1,
    user_count: 1,
    distribution: { like: 0, dislike: 0, love: 1, laugh: 0, shocked: 0, bravo: 0, spoiler: 0 },
  },
};

const wait = () => new Promise((resolve) => setTimeout(resolve, 600));

let nextId = 1000;
const now = () => new Date().toISOString();
// The API's 5-word minimum, so the demo can show the error toast.
const tooShort = (text: string) => text.split(/\s+/).filter(Boolean).length < 5;
const REJECTED = { ok: false, message: 'Comment must be at least 5 words.' } as const;

/**
 * Answers the card's browser calls from the fixtures, with a short wait so "loading replies" and the spinners show.
 * Writes never leave the page: replies come back as the demo viewer, and edits echo what was sent.
 */
export const client: CommentsClient = {
  replies: async (id) => {
    await wait();
    return replies.filter((item) => item.parent_id === id);
  },
  reactionSummary: (id) => Promise.resolve(summaries[id]),
  reply: async (id, text) => {
    await wait();
    if (tooShort(text)) return REJECTED;
    const user = member('og_viewer', 'OG Viewer');
    return { ok: true, comment: comment({ id: nextId++, parent_id: id, comment: text, user, created_at: now() }) };
  },
  edit: async (id, body) => {
    await wait();
    if (tooShort(body.comment)) return REJECTED;
    const user = member('og_viewer', 'OG Viewer');
    return { ok: true, comment: comment({ id, ...body, user, updated_at: now() }) };
  },
  remove: async () => {
    await wait();
    return { ok: true, comment: null };
  },
  block: async () => {
    await wait();
    return { ok: true };
  },
};

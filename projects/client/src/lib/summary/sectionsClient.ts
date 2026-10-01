import { type CommentResponse, commentResponseSchema } from '@trakt/api';
import { z } from 'zod/v4';
import type { api } from '../api/api.ts';
import { contractSchema } from '../api/contractSchema.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { socialRowsSchema } from './socialRowsSchema.ts';
import { summaryListSchema } from './summaryListSchema.ts';
import type { SocialRow } from './SocialRow.ts';
import type { SummaryMedia } from './SummaryMedia.ts';
import { type ActivityTab, toActivity } from './toActivity.ts';
import { type RelatedCard, toRelatedCard } from './toRelatedCard.ts';
import { type SummaryList, toSummaryList } from './toSummaryList.ts';

type Api = ReturnType<typeof api>;

// OG's `.limit(3)` comments and `summary_lists(limit: 3)`, and `related(6)`.
const PREVIEW_LIMIT = 3;
const RELATED_LIMIT = 6;
// The worker's page cap, so one call covers every followed member OG listed.
const SOCIAL_LIMIT = 250;

export type CommentTab = {
  readonly id: 'likes' | 'recent' | 'me';
  readonly label: string;
  /** The badge inside the pill: "Likes" with "All Time". */
  readonly count?: string;
  readonly comments: readonly CommentResponse[];
};

export type ListTab = {
  readonly id: 'popular' | 'me';
  readonly label: string;
  readonly lists: readonly SummaryList[];
};

type SectionsClientParams = {
  /** Public calls, without the viewer's token: they stay cacheable and a stale token can't 401 them. */
  anonymous: Api;
  /** Calls about the viewer, or filtered for them (blocked members' comments). */
  viewer: Api;
  /** The same fetch as `viewer`, for the routes `@trakt/api` has no contract for. */
  viewerFetch: typeof fetch;
  signedIn: boolean;
  now?: () => Date;
};

export type SectionsClient = {
  /** "People You Follow", or `null` when nobody is watching and no followed member has any activity. */
  activity: (media: SummaryMedia) => Promise<readonly ActivityTab[] | null>;
  comments: (media: SummaryMedia) => Promise<readonly CommentTab[] | null>;
  lists: (media: SummaryMedia) => Promise<readonly ListTab[] | null>;
  related: (media: SummaryMedia) => Promise<readonly RelatedCard[] | null>;
};

type Response = { status: number; body: unknown };
type Body<R extends Response> = Extract<R, { status: 200 }>['body'];

/** The body of a 200, or `null` for anything else: a section loses a tab, not the page. */
const ok = <R extends Response>(request: Promise<R>): Promise<Body<R> | null> =>
  request.then((response) => (response.status === 200 ? response.body : null)).catch(() => null);

const nonEmpty = <T>(items: readonly T[]) => (items.length > 0 ? items : null);

/**
 * The lazy summary sections' reads, mapped for their components. Logged out, the calls about the viewer are skipped. Every failure
 * degrades to a missing tab, and a section with no tabs comes back `null`.
 */
export function sectionsClient({
  anonymous,
  viewer,
  viewerFetch,
  signedIn,
  now = () => new Date(),
}: SectionsClientParams): SectionsClient {
  const raw = async <T>(path: string, parse: (body: unknown) => T | null): Promise<T | null> => {
    if (!signedIn) return null;
    const response = await rawApiFetch({ fetch: viewerFetch, path }).catch(() => null);
    if (!response?.ok) return null;
    return parse(await response.json().catch(() => null));
  };
  const parsed = <T>(schema: { safeParse: (body: unknown) => { success: boolean; data?: T } }) => (body: unknown) =>
    contractSchema(schema).safeParse(body).data ?? null;

  const mediaPath = (media: SummaryMedia) =>
    media.type === 'episode'
      ? `/shows/${media.slug}/seasons/${media.season}/episodes/${media.episode}`
      : media.type === 'season'
      ? `/shows/${media.slug}/seasons/${media.season}`
      : `/${media.type}s/${media.slug}`;

  const watching = (media: SummaryMedia) =>
    media.type === 'episode'
      ? ok(
        anonymous.shows.episode.watching({
          params: { id: media.slug, season: media.season, episode: media.episode },
          query: {},
        }),
      )
      : watchingOther(media);
  const watchingOther = ({ type, slug, season }: SummaryMedia) =>
    type === 'season'
      ? ok(anonymous.shows.season.watching({ params: { id: slug, season: season ?? 0 }, query: {} }))
      : type === 'movie'
      ? ok(anonymous.movies.watching({ params: { id: slug }, query: {} }))
      : ok(anonymous.shows.watching({ params: { id: slug }, query: {} }));

  const comments = (media: SummaryMedia, sort: 'likes' | 'newest') => {
    const { type, slug, season } = media;
    const request = { params: { id: slug, sort }, query: { extended: 'images', limit: PREVIEW_LIMIT } } as const;
    if (media.type === 'episode') {
      return ok(
        viewer.shows.episode.comments({
          ...request,
          params: { ...request.params, season: media.season, episode: media.episode },
        }),
      );
    }
    if (type === 'season') {
      return ok(viewer.shows.season.comments({ ...request, params: { ...request.params, season: season ?? 0 } }));
    }
    return type === 'movie' ? ok(viewer.movies.comments(request)) : ok(viewer.shows.comments(request));
  };

  const lists = (media: SummaryMedia, kind: 'official' | 'personal', limit?: number) => {
    const { type, slug, season } = media;
    const request = {
      params: { id: slug, type: kind, sort: 'popular' },
      query: { extended: 'images', limit },
    } as const;
    if (media.type === 'episode') {
      return ok(
        anonymous.shows.episode.lists({
          ...request,
          params: { ...request.params, season: media.season, episode: media.episode },
        }),
      );
    }
    if (type === 'season') {
      return ok(anonymous.shows.season.lists({ ...request, params: { ...request.params, season: season ?? 0 } }));
    }
    return type === 'movie' ? ok(anonymous.movies.lists(request)) : ok(anonymous.shows.lists(request));
  };

  return {
    activity: async (media) => {
      const [everyone, social] = await Promise.all([
        watching(media),
        media.type === 'season' ? null : raw<readonly SocialRow[]>(
          `${mediaPath(media)}/social?limit=${SOCIAL_LIMIT}&extended=images`,
          parsed(socialRowsSchema),
        ),
      ]);
      return nonEmpty(toActivity({ watching: everyone ?? [], social }));
    },

    comments: async (media) => {
      const [likes, recent, mine] = await Promise.all([
        comments(media, 'likes'),
        comments(media, 'newest'),
        raw<readonly CommentResponse[]>(
          `${mediaPath(media)}/comments/mine?limit=${PREVIEW_LIMIT}&extended=images`,
          parsed(commentResponseSchema.array()),
        ),
      ]);
      const tabs: readonly CommentTab[] = [
        { id: 'likes', label: 'Likes', count: 'All Time', comments: likes ?? [] },
        { id: 'recent', label: 'Recent', comments: recent ?? [] },
        { id: 'me', label: 'Me', comments: mine ?? [] },
      ];
      return nonEmpty(tabs.filter((tab) => tab.comments.length > 0));
    },

    lists: async (media) => {
      const [official, popular, mine] = await Promise.all([
        lists(media, 'official'),
        lists(media, 'personal', PREVIEW_LIMIT),
        raw(
          `${mediaPath(media)}/listed?extended=images`,
          (body) => z.array(summaryListSchema).safeParse(body).data ?? null,
        ),
      ]);
      // OG put the official lists (a movie's collection) ahead of the popular personal ones. "Me" is only the
      // viewer's personal lists, most liked first: `/listed` also sends the watchlist and favorites, newest first.
      const tabs: readonly ListTab[] = [
        { id: 'popular', label: 'Popular', lists: [...official ?? [], ...popular ?? []].map(toSummaryList) },
        {
          id: 'me',
          label: 'Me',
          lists: (mine ?? [])
            .filter((list) => list.type === 'personal')
            .toSorted((a, b) => b.likes - a.likes)
            .slice(0, PREVIEW_LIMIT)
            .map(toSummaryList),
        },
      ];
      return nonEmpty(tabs.filter((tab) => tab.lists.length > 0));
    },

    related: async (media) => {
      if (media.type === 'season' || media.type === 'episode') return null;
      const query = { extended: 'full,images', limit: RELATED_LIMIT } as const;
      const date = now();
      if (media.type === 'movie') {
        const movies = await ok(anonymous.movies.related({ params: { id: media.slug }, query }));
        return nonEmpty((movies ?? []).map((item) => toRelatedCard({ type: 'movie', item }, date)));
      }
      const shows = await ok(anonymous.shows.related({ params: { id: media.slug }, query }));
      return nonEmpty((shows ?? []).map((item) => toRelatedCard({ type: 'show', item }, date)));
    },
  };
}

# Pages

How an og page is built. The charts pages are the reference. Copy their shape.

## Files

- Feature code lives in `src/lib/<area>/`: the loader (`load<Page>.ts`), pure mappers from API rows to view models (`to<Thing>.ts`, each with a spec), and the page component (`<Page>Page.svelte`).
- The route files stay one-liners. `+page.server.ts` calls the loader, and `+page.svelte` renders `<XPage {data} />`.
- A path param with a fixed set of values gets a matcher in `src/params/` (see `chart.ts`). A matched param outranks a plain `[slug]`, so `shows/[chart=chart]` and `shows/[slug]` can sit side by side. Don't use a catch-all like `[type=media]/…`, because it loses to static segments.
- A bare section URL that OG redirects gets a `+server.ts` with `GET` → `redirect(302, …)`.

## Loaders

- Run the API calls and `await parent()` together (`Promise.all`), so there's no waterfall. `parent()` gives the layout's `user`, `settings` and `datePreferences`.
- **Public endpoints go without the token:** `api({ fetch })`. apiz returns 401 to a stale cookie token even on a public route. Pass `token: locals.token` only on calls that are about the viewer.
- Read pagination with `extractPageMeta`. A non-200 from apiz throws `error(502, …)`, and a 404 for a missing slug throws `error(404, …)`.
- Off-contract responses (`rawApiFetch`, no contract, API) are parsed with zod at the loader. See `implementation.md` → API Responses.
- Map rows with pure functions. Pass `now` and `datePreferences` in as arguments; don't read them inside. Anything formatted on the server uses `datePreferences.timeZone`, so SSR and hydration match.

## Page component

- It renders inside the shell's `<main>`, never its own. The fixed header is 65px, so the page supplies its own hero or top offset.
- `<svelte:head>`: `<title>` as "<Title> - Trakt" and a meta description.
- Build from the design system: the `components/frame/` sidebar frame (`Frame`, `FrameNav`, `FrameGrid`), `components/media/` cards, `Pagination` / `PageNav`, `Tooltip`, `Container`. Anything new that another page could use goes into `src/lib/components/` in the same PR, with its tokens in their own group in `tokens.css`.
- User state on posters: `overlay.state(type, id)` plus `quickIconFill({ state, airedEpisodes, datePreferences })`.
- If two areas need the same helper (media URL builders, say) and it's not in `src/lib/` yet, keep yours local and note it in the PR for a follow-up dedup. Don't race another open PR to create the shared one.

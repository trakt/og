# og

og is a visual clone of the classic Trakt site, built with SvelteKit and Deno on the trakt-web fork layout.
The app lives in `projects/client/`. Shared code and design rules live in `.agents/rules/`.

## Commands

Run these from the repository root:

- `deno task install`: install pinned dependencies from the lockfile.
- `deno task client:dev`: start the dev server.
- `deno task client:ci`: formatting, lint, types, tests and production build.
- `deno task client:check`: type checks.
- `deno task client:test`: tests.
- `deno task client:build`: production build.
- `deno task client:verify [pr]`: CI, supply chain, commit and leak checks.
- `deno task client:land <pr>`: rebase, verify and land a PR, then close its issues.
- `deno task client:deploy`: human-run deployment.

## Hard rules

- Never push to main. PRs land only via `deno task client:land <pr>`, never directly with `gh pr merge`.
- Use the latest stable dependencies, pinned to exact versions. Review and validate upgrades.
- Desktop first. Match the classic layout at 1440px; smaller screens must be usable.
- Clone the UI, not the code. Rebuild with this app's components and CSS.
- Follow `.agents/rules/design-system.md` and the matching rules in `.agents/rules/` before changing code.
- Follow the accessibility and testing rules in `.agents/rules/a11y.md` and `.agents/rules/testing.md`.
- Agents never deploy; a human runs the deployment task.

## Working an issue

- The board is [trakt/og's issues](https://github.com/trakt/og/issues). Use GitHub's standard labels (`bug`, `enhancement`, `documentation`, etc.) plus `allowlist-change`.
- Assignment is ownership: take the issue you are handed with `gh issue edit N --repo trakt/og --add-assignee @me`. Without a specific issue, take the oldest open issue with no assignee. Never pick an assigned issue. One agent, one issue; when agents share a GitHub login, the person or orchestrator starting them hands each its own issue.
- Work in a worktree off `origin/main`. Open a draft PR early with `Closes #N` in its body. Keep PR titles, bodies, commits and comments public-safe; never include private implementation details or local paths.
- Build per `AGENTS.md` and `.agents/rules/`, run `deno task client:ci` while working, then ship with `deno task client:land <pr>`: rebase, verify (including the leak check), merge the verified commit and close the issue. For a process change without an issue, use a `No issue: <why>` line in the PR body.
- If you need a human, comment on the issue with what's needed, unassign yourself and stop. If you give up, leave a one-line reason and unassign yourself.
- If part of an issue has no API path and no other workable way, cut that part, explain the cut in the PR and ship the rest.

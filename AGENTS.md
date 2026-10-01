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
- `deno task client:land <pr> --issue <N>`: land a verified PR.
- `deno task client:deploy`: human-run deployment.

## Hard rules

- Never push to main. PRs land only via `deno task client:land <pr> --issue <N>`.
- Use the latest stable dependencies, pinned to exact versions. Review and validate upgrades.
- Desktop first. Match the classic layout at 1440px; smaller screens must be usable.
- Clone the UI, not the code. Rebuild with this app's components and CSS.
- Follow `.agents/rules/design-system.md` and the matching rules in `.agents/rules/` before changing code.
- Agents never deploy; a human runs the deployment task.

Planning docs and the issue board are private; agents are given access separately.

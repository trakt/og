<!-- Adapted from trakt-web .agents/rules/testing.md -->

# Testing

- Vitest. Specs are colocated next to their source as `*.spec.ts`.
- Test pure functions and data mappers first: business logic and transformations.
- Test behavior, not implementation. Verify what the code does, not how.
- Mock HTTP with MSW once API calls exist. Never hit apiz from a test.
- Run one file while iterating: `deno task test src/lib/foo.spec.ts`. Run `deno task ci` before opening a PR.

## Describe / It conventions

- The top-level `describe` names the unit under test, optionally prefixed by its kind:
  `describe('util: prependHttps', ...)`.
- Nested `describe` blocks group by scenario (for example `'for shows'`).
- `it` titles read as sentences starting with `'should ...'`.

## Visual checks

- Compare pages and components against visual references with screenshots at 1440px. See `clone-the-ui.md`.

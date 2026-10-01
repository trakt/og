<!-- Adapted from trakt-web.agents/rules/implementation.md -->

# Implementation Guidelines

## Before Writing Code

- **Search for existing patterns first.** This codebase has conventions - follow them.
- Check how similar functionality is implemented elsewhere before creating something new.
- Prefer referencing real files as examples over abstract descriptions.

## When Establishing New Patterns

- When you establish a new pattern that diverges from or extends existing conventions, note it so documentation can be
  updated.
- If you find yourself writing a helper used in 2+ places, consider whether it belongs in `lib/utils/`.
- If you refactor shared logic, document the new pattern.

## API Responses

- **Native routes with a contract:** use the typed `api` client. Its types are trusted, but `@trakt/api` doesn't validate at runtime, so a wrong contract means wrong types.
- **Anything else is parsed with zod at the boundary** (the loader, or the browser call site): every `rawApiFetch` body, every route `@trakt/api` has no contract for (including all `/v3/*`), and every response whose shape differs from the contract. Use `import { z } from 'zod/v4'`, map the parsed data with a pure function, and never cast a body with `as T` or `as Promise<T>`. `src/lib/users/notes/noteRowsSchema.ts` is the reference.
- og has exactly one zod, the one `@trakt/api` depends on. Never add another (see the FIXME in `noteRowsSchema.ts`).
- If a contract is wrong, document the response mismatch and validate the fields this app needs at the boundary.

- **PascalCase**: component names, interfaces, type aliases
- **camelCase**: variables, functions, methods
- **ALL_CAPS**: global constants only (not local constants)
- Components: PascalCase files (e.g., `ClampedText.svelte`, `MoreButton.svelte`)
- Utilities/helpers: camelCase files (e.g., `lineClamp.ts`, `clickOutside.ts`)
- Type definitions: PascalCase files (e.g., `MediaStoreProps.ts`, `FilterParams.ts`)

## Module Imports

- **No barrel files.** Do not create `index.ts` files whose only job is to re-export from siblings. Import directly from
  the file that owns the symbol (e.g. `$lib/features/intl-overlay/withBulkIntlOverlay.ts`, not
  `$lib/features/intl-overlay/index.ts`). Reasons:
  - Tree-shaking and IDE jump-to-definition both work better against the real file.
  - Barrels create circular-import risk when sibling modules import each other through the barrel.
  - Renames and deletions are easier to grep when every importer references the concrete path.
- If an existing barrel is the only public surface of a feature, prefer removing it and updating callers over extending
  it. Do not add new re-exports to surviving barrels.
- **One export per file, named like the file.** Each module should expose a single primary symbol whose name matches the
  file name (minus the extension). Examples: `withBulkIntlOverlay.ts` exports `withBulkIntlOverlay`; `BulkIntlTarget.ts`
  exports the `BulkIntlTarget` type; `scheduleEntryTargets.ts` exports `scheduleEntryTargets`.
- **Unexported helpers inside the same file are fine.** The rule above is about the public surface, not the file body. A
  module can declare any number of local types, constants, or helper functions as long as they stay module-private (no
  `export` keyword). Promote them to their own file only once a second module needs to import them. Co-located
  `*.spec.ts` files do not count as separate exports.

## TypeScript Standards

- Always use TypeScript with strict mode.
- Never add `ignoreDeprecations` to tsconfig. TypeScript 6 deprecations become hard errors in 7, and fixing them as they appear keeps the TS 7 upgrade a one-line bump.
- No `any` types; use specific types or utility types.
- Use Zod for runtime validation and type inference. Define schema first, then derive type with `z.infer`.
- Use `.nullish` in Zod schemas for optional nullable fields.
- Use optional chaining (`?.`) and nullish coalescing (`??`).

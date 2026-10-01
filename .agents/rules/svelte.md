# Svelte

- Runes only: `$state`, `$derived`, `$effect`, `$props`. No legacy `$:`, `export let` or stores for component state.
- Props are typed.
- DOM behavior goes in attachments (`{@attach}`) or actions, not in `onMount` querying the DOM.
- Page data loads in `+page.server.ts` / `+layout.server.ts` `load()`. Client-side fetching is only for interactions
  (writes, the overlay, popovers).
- `hooks.server.ts` is where cross-cutting request logic goes (reading the auth cookie). Keep it thin.

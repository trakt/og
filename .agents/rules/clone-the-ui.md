# Clone the UI, not the code

- Match the classic Trakt UI at desktop width, 1440px. Smaller screens must be usable.
- Use visual references to learn what a page shows and how it behaves. Compare screenshots at the same viewport.
- Carry values over exactly: colors, sizes, spacing, breakpoints and copy. Rebuild the structure with og's components and CSS.
- Never paste another application's implementation. Never use Bootstrap class names.
- Read trakt-web for ideas, then reimplement for og.
- List visual deviations in the PR with their reason: API limitations, cut features or accessibility.

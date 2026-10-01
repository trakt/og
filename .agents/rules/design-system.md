# Design system

- Pages use design system tokens (CSS custom properties) and existing components only.
- A new color, spacing, radius, shadow or font size becomes a token first. No inline magic numbers.
- A component a page needs that doesn't exist yet gets built as a design system component in the same PR, with a demo
  route next to its OG screenshot.
- Styles are component-scoped. No global class soup, and no utility framework.
- Layout uses grid and flex, with container queries so a component adapts to where it's placed. Use logical properties
  and native CSS nesting.
- Dark mode uses `color-scheme` and `light-dark` tokens, not a second stylesheet.

## Icons

Every OG icon comes from OG's own fonts, so it matches exactly. Never hand-draw one or substitute a similar icon.

1. Find the icon's exact class in the visual reference: `fa-thin fa-gear` is `thin gear`, `trakt-icon-check-thick` is
   `trakt check-thick`, `logos-icon-dts_x` is `logos dts_x`. A bare `fa fa-x` (no style class) is `solid`.
2. Run `cd projects/client && deno task icon <family> <name>`. It writes `src/lib/icons/<family>/<name>.svg`. Families: `solid`, `regular`,
   `light`, `thin`, `brands`, `kit`, `trakt`, `logos`. An alias is saved under its canonical name, and the task says so.
   Set `OG_ASSET_PATH` to a local directory containing the source fonts and stylesheets.
3. Commit the SVG as the task wrote it. Don't edit or reformat it.
4. Render it with `<Icon svg={gear} />` after `import gear from '$lib/icons/thin/gear.svg?raw'`. Add `fixedWidth` where
   OG used `fa-fw`, and `label` when the icon is the only thing saying what a control does.

When OG picks the icon at runtime (the `logos-icon-#{format}` formats, gender icons, social network brands), extract the
whole set it can pick from, not just the one your test data shows.

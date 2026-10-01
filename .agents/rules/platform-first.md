# Platform first

Prefer built-in browser features over libraries, as long as the result still looks like OG.

| Need                       | Use                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Modals, lightboxes         | `<dialog>`                                                                                  |
| Dropdowns, menus, tooltips | Popover API                                                                                 |
| Date/time input            | `<input type="datetime-local">` (a small component only if it can't be styled close enough) |
| Share                      | Web Share API with a copy-link fallback                                                     |
| Toasts                     | og's toast component                                                                        |
| Icons                      | SVGs extracted from OG's fonts, through the icon component. No icon fonts or FA packages    |

- Adding a dependency needs a justification in the PR: what the platform can't do.
- Every dependency is on its latest release. Deno refuses versions under 24h old, which is fine; take the newest one it
  allows.

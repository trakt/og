/**
 * The `data-theme` on `<html>` (`src/lib/styles/tokens.css`): `system` follows `prefers-color-scheme` through
 * `color-scheme: light dark`, so Auto needs no cookie.
 */
export type Theme = 'light' | 'dark' | 'system';

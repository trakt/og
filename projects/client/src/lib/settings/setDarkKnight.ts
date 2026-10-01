import type { DarkKnight } from './DarkKnight.ts';
import type { SaveSettingsResult } from './saveSettings.ts';
import type { SettingsBody } from './toSettingsPatch.ts';
import { toTheme } from './toTheme.ts';

type SetDarkKnightParams = {
  readonly value: DarkKnight;
  /** Sends a `PUT /users/settings` body as the viewer. */
  readonly save: (body: SettingsBody) => Promise<SaveSettingsResult>;
  /** Reloads the layout's settings, so every page and the next server render see the new value. */
  readonly reload: () => Promise<void>;
  /** Shows a failed save's message. */
  readonly notify: (message: string) => void;
  /** The element carrying `data-theme`: `<html>`. */
  readonly root: Pick<HTMLElement, 'dataset'>;
};

/**
 * Switches Dark Knight the way OG did (settings.js:529-544, global.js:4011-4017): the page changes at once, then the
 * setting saves in the background. A failed save puts the old theme back and says why; OG ignored the failure.
 * Resolves whether it saved.
 */
export async function setDarkKnight({ value, save, reload, notify, root }: SetDarkKnightParams): Promise<boolean> {
  const before = root.dataset.theme;
  root.dataset.theme = toTheme(value);

  const result = await save({ browsing: { dark_knight: value } });
  if (result.saved) {
    await reload();
    return true;
  }

  if (before === undefined) delete root.dataset.theme;
  else root.dataset.theme = before;
  result.errors.forEach((message) => notify(message));
  return false;
}

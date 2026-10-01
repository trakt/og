import { saveSettings } from '../../settings/saveSettings.ts';
import type { SettingsRequest } from '../../settings/saveSettings.ts';

type ChangeProgressViewParams = {
  /** Simple Progress Bars or Grid View. */
  view: 'simple_progress' | 'grid_view';
  /** The settings group the tab reads: `watched` (Watched and Dropped) or `collected` (Library). */
  settings: 'watched' | 'collected';
  /** The toggle's new state. */
  on: boolean;
  /** Shows a state on the page: the new one right away, the old one again if the save fails. */
  apply: (on: boolean) => void;
  request: SettingsRequest;
  notify: { error: (message: string) => void };
};

/**
 * OG's view toggles in the progress subnav: each saves to the viewer's own
 * `browsing.progress.<settings>` through `PUT /users/settings`, the settings page's save path. The page shows the new
 * state before the save and goes back to the old one, with the error, if it fails. Resolves whether it saved.
 */
export async function changeProgressView(
  { view, settings, on, apply, request, notify }: ChangeProgressViewParams,
): Promise<boolean> {
  apply(on);
  const result = await saveSettings({
    request,
    body: { browsing: { progress: { [settings]: { [view]: on } } } },
    email: null,
    avatar: null,
  });
  if (result.saved) return true;

  apply(!on);
  result.errors.forEach((message) => notify.error(message));
  return false;
}

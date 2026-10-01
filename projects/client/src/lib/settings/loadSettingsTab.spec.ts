import { describe, expect, it } from 'vitest';
import { loadSettingsTab } from './loadSettingsTab.ts';
import { sharingSettingsFixture } from './sharingSettingsFixture.ts';
import type { ViewerSettings } from './ViewerSettings.ts';

const url = new URL('https://og.trakt.tv/settings/sharing?x=1');
const parent = (settings: unknown) => () => Promise.resolve({ settings: settings as ViewerSettings | null });

describe('loadSettingsTab', () => {
  it('should send a logged-out visitor to sign in with a return path', async () => {
    await expect(loadSettingsTab({ locals: { token: null }, parent: parent(null), url })).rejects.toMatchObject({
      status: 302,
      location: '/auth/signin?redirect_to=%2Fsettings%2Fsharing%3Fx%3D1',
    });
  });

  it('should render the expired state when the layout has no settings', async () => {
    expect(await loadSettingsTab({ locals: { token: 't' }, parent: parent(null), url })).toEqual({ expired: true });
    expect(await loadSettingsTab({ locals: { token: 't' }, parent: parent(sharingSettingsFixture), url })).toEqual({
      expired: false,
    });
  });
});

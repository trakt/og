import { describe, expect, it } from 'vitest';
import type { DatePreferences } from '../DatePreferences.ts';
import type { ViewerSettings } from '../ViewerSettings.ts';
import { loadAdvancedSettings } from './loadAdvancedSettings.ts';

const url = new URL('https://og.trakt.tv/settings/advanced?x=1');
const now = new Date('2026-09-30T12:00:00Z');
const datePreferences: DatePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 };
const parent = (settings: unknown) => () =>
  Promise.resolve({ settings: settings as ViewerSettings | null, datePreferences });

describe('loadAdvancedSettings', () => {
  it('should send a logged-out visitor to sign in and back', async () => {
    await expect(loadAdvancedSettings({ locals: { token: null }, parent: parent(null), url, now })).rejects
      .toMatchObject({ status: 302, location: '/auth/signin?redirect_to=%2Fsettings%2Fadvanced%3Fx%3D1' });
  });

  it("should map the layout's settings into the limits", async () => {
    const settings = { user: { vip: true, joined_at: '2012-02-12T09:00:00.000Z' } };
    expect(await loadAdvancedSettings({ locals: { token: 'token' }, parent: parent(settings), url, now }))
      .toMatchObject({ expired: false, vip: true, limits: { vip: true, date: 'February 12', years: '14.63' } });
  });

  it('should render expired when the API refused the cookie', async () => {
    expect(await loadAdvancedSettings({ locals: { token: 'spent' }, parent: parent(null), url, now })).toEqual({
      expired: true,
      vip: false,
      limits: null,
    });
  });
});

import { ErrorResponse } from 'oidc-client-ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeUser } from './fakeUser.ts';
import { fakeUserManager } from './fakeUserManager.ts';
import { renewAccessToken } from './renewAccessToken.ts';

describe('renewAccessToken', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('should renew when the stored token has lapsed', async () => {
    const renewed = fakeUser('new', 3600);
    const fake = fakeUserManager({ current: fakeUser('old', -1), signinSilent: () => Promise.resolve(renewed) });

    expect(await renewAccessToken({ manager: fake.manager })).toBe(renewed);
    expect(fake.signinSilent).toHaveBeenCalledTimes(1);
  });

  it('should adopt a token another tab just stored', async () => {
    const current = fakeUser('fresh', 3600);
    const fake = fakeUserManager({ current });

    expect(await renewAccessToken({ manager: fake.manager, rejectedToken: 'spent' })).toBe(current);
    expect(fake.signinSilent).not.toHaveBeenCalled();
    expect(fake.events.load).toHaveBeenCalledWith(current);
  });

  it('should renew a fresh-looking token the server just rejected', async () => {
    const current = fakeUser('fresh', 3600);
    const fake = fakeUserManager({ current });

    await renewAccessToken({ manager: fake.manager, rejectedToken: 'fresh' });

    expect(fake.signinSilent).toHaveBeenCalledTimes(1);
  });

  it('should renew a token inside its expiring window', async () => {
    const fake = fakeUserManager({ current: fakeUser('soon', 30) });

    await renewAccessToken({ manager: fake.manager });

    expect(fake.signinSilent).toHaveBeenCalledTimes(1);
  });

  it('should remove the user when the grant is refused', async () => {
    const fake = fakeUserManager({ signinSilent: () => Promise.reject(new ErrorResponse({ error: 'invalid_grant' })) });

    expect(await renewAccessToken({ manager: fake.manager })).toBeNull();
    expect(fake.removeUser).toHaveBeenCalledTimes(1);
  });

  it('should keep the user when the renewal fails transiently', async () => {
    const fake = fakeUserManager({ signinSilent: () => Promise.reject(new TypeError('Failed to fetch')) });

    expect(await renewAccessToken({ manager: fake.manager })).toBeNull();
    expect(fake.removeUser).not.toHaveBeenCalled();
  });

  it('should renew inside the Web Lock', async () => {
    const order: string[] = [];
    const fake = fakeUserManager({
      signinSilent: () => {
        order.push('renew');
        return Promise.resolve(null);
      },
    });
    const request = vi.fn(async (name: string, task: () => Promise<unknown>) => {
      order.push(`lock ${name}`);
      const result = await task();
      order.push('unlock');
      return result;
    });
    vi.stubGlobal('navigator', { locks: { request } });

    await renewAccessToken({ manager: fake.manager });

    expect(order).toEqual(['lock og-auth-renew', 'renew', 'unlock']);
  });
});

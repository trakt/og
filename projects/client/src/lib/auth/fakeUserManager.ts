import type { User, UserManager } from 'oidc-client-ts';
import { vi } from 'vitest';

type FakeUserManagerParams = {
  current?: User | null;
  signinSilent?: () => Promise<User | null>;
};

/** A test double for the parts of `UserManager` og calls. */
export function fakeUserManager({ current = null, signinSilent = () => Promise.resolve(null) }: FakeUserManagerParams) {
  const fake = {
    getUser: vi.fn(() => Promise.resolve(current)),
    signinSilent: vi.fn(signinSilent),
    removeUser: vi.fn(() => Promise.resolve()),
    events: {
      load: vi.fn(() => Promise.resolve()),
      addUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn(),
      removeUserLoaded: vi.fn(),
      removeUserUnloaded: vi.fn(),
    },
    settings: { accessTokenExpiringNotificationTimeInSeconds: 60 },
  };

  return { ...fake, manager: fake as unknown as UserManager };
}

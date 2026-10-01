import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { GET } from './+server.ts';

const locationFor = (token: string | null) => {
  try {
    GET({ locals: { token } } as Parameters<typeof GET>[0]);
  } catch (thrown) {
    if (isRedirect(thrown)) return thrown.location;
    throw thrown;
  }
  return null;
};

describe('route: /calendars', () => {
  it('should open My Shows & Movies signed in', () => {
    expect(locationFor('fake-token')).toBe('/calendars/my/shows-movies');
  });

  it('should open All Shows signed out', () => {
    expect(locationFor(null)).toBe('/calendars/shows');
  });
});

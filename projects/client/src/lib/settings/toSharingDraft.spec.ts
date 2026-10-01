import { describe, expect, it } from 'vitest';
import { sharingSettingsFixture } from './sharingSettingsFixture.ts';
import { toSharingDraft } from './toSharingDraft.ts';

describe('toSharingDraft', () => {
  it('should read the sharing texts and fill a blank "Just Rated" as OG does', () => {
    expect(toSharingDraft(sharingSettingsFixture)).toEqual({
      watching: "I'm watching [item]!",
      watched: 'I just watched [item]',
      rated: '[item] [stars]',
    });
  });

  it('should keep a saved "Just Rated" and leave the others blank when they were never set', () => {
    expect(toSharingDraft({ sharing_text: { watching: null, rated: '[stars] for [item]' } })).toEqual({
      watching: '',
      watched: '',
      rated: '[stars] for [item]',
    });
    expect(toSharingDraft({})).toEqual({ watching: '', watched: '', rated: '[item] [stars]' });
  });

  it('should return null for an unexpected shape', () => {
    expect(toSharingDraft(null)).toBeNull();
    expect(toSharingDraft({ sharing_text: { watching: 3 } })).toBeNull();
  });
});

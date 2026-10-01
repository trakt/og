import { describe, expect, it } from 'vitest';
import { findCodepoint } from './findCodepoint.ts';

const FA_VARIABLES = `
$fa-css-prefix : fa !default;
$fa-var-gear: \\f013;
$fa-var-cog: \\f013;
$fa-var-xmark: \\f00d;
$fa-var-close: \\f00d;
$fa-var-times: \\f00d;
$fa-var-x-twitter: \\e61b;

$fa-icons: (
  "gear": $fa-var-gear,
);

$fa-custom-icons: (
  justwatch: "\\e00a",
  thin-play-clock: "\\e001",
);
`;

const ICON_FONTS = `
.trakt-icon-check-thick:before {
  content: "\\e602";
}

.trakt-icon-list:before {
  content: "\\e607";
}

.logos-icon-dts_x:before {
  content: "\\e60e";
}
`;

describe('findCodepoint', () => {
  describe('for Font Awesome names', () => {
    it('should find the codepoint of a canonical name', () => {
      expect(findCodepoint({ lookup: 'fa', name: 'x-twitter', stylesheet: FA_VARIABLES }))
        .toEqual({ name: 'x-twitter', codepoint: 0xe61b });
    });

    it('should resolve an alias to its canonical name', () => {
      expect(findCodepoint({ lookup: 'fa', name: 'times', stylesheet: FA_VARIABLES }))
        .toEqual({ name: 'xmark', codepoint: 0xf00d });
      expect(findCodepoint({ lookup: 'fa', name: 'cog', stylesheet: FA_VARIABLES }))
        .toEqual({ name: 'gear', codepoint: 0xf013 });
    });

    it('should not match a kit icon', () => {
      expect(findCodepoint({ lookup: 'fa', name: 'justwatch', stylesheet: FA_VARIABLES })).toBeUndefined();
    });
  });

  describe('for Font Awesome Kit names', () => {
    it('should find the codepoint in the custom icons map', () => {
      expect(findCodepoint({ lookup: 'kit', name: 'thin-play-clock', stylesheet: FA_VARIABLES }))
        .toEqual({ name: 'thin-play-clock', codepoint: 0xe001 });
    });

    it('should not match a regular Font Awesome name', () => {
      expect(findCodepoint({ lookup: 'kit', name: 'gear', stylesheet: FA_VARIABLES })).toBeUndefined();
    });
  });

  describe('for the trakt and logos fonts', () => {
    it('should find a trakt icon by its class name', () => {
      expect(findCodepoint({ lookup: 'trakt', name: 'check-thick', stylesheet: ICON_FONTS }))
        .toEqual({ name: 'check-thick', codepoint: 0xe602 });
    });

    it('should find a logos icon, including underscores in its name', () => {
      expect(findCodepoint({ lookup: 'logos', name: 'dts_x', stylesheet: ICON_FONTS }))
        .toEqual({ name: 'dts_x', codepoint: 0xe60e });
    });

    it('should only match the family it was asked for', () => {
      expect(findCodepoint({ lookup: 'logos', name: 'list', stylesheet: ICON_FONTS })).toBeUndefined();
    });
  });

  it('should return undefined for an unknown name', () => {
    expect(findCodepoint({ lookup: 'fa', name: 'not-an-icon', stylesheet: FA_VARIABLES })).toBeUndefined();
  });
});

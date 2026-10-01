// opentype.js 2.x ships no type declarations, and @types/opentype.js describes 1.x. These cover the parts og uses.
// og imports the ESM build by path because Deno resolves the package's CommonJS `main` and Vite its ESM `module`.
declare module 'opentype.js/dist/opentype.mjs' {
  interface PathDataOptions {
    decimalPlaces?: number;
    optimize?: boolean;
    flipY?: boolean;
  }

  export class Path {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    close(): void;
    toPathData(options?: PathDataOptions): string;
  }

  interface GlyphOptions {
    name: string;
    unicode?: number;
    advanceWidth: number;
    path: Path;
  }

  export class Glyph {
    constructor(options: GlyphOptions);
    advanceWidth?: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }

  interface FontOptions {
    familyName: string;
    styleName: string;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    glyphs: Glyph[];
  }

  export class Font {
    constructor(options: FontOptions);
    unitsPerEm: number;
    ascender: number;
    descender: number;
    glyphs: { get(index: number): Glyph | undefined };
    charToGlyphIndex(char: string): number | null;
    toArrayBuffer(): ArrayBuffer;
  }

  export function parse(buffer: ArrayBuffer): Font;
}

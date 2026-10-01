interface GlyphToSvgParams {
  readonly pathData: string;
  readonly width: number;
  readonly height: number;
}

export function glyphToSvg({ pathData, width, height }: GlyphToSvgParams): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
    `<path fill="currentColor" d="${pathData}"/></svg>\n`;
}

interface IconSvg {
  readonly viewBox: string;
  readonly pathData: string;
}

/** Reads the viewBox and single path out of an SVG written by `deno task icon`. */
export function parseIconSvg(svg: string): IconSvg {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.at(1);
  const pathData = svg.match(/<path[^>]*\sd="([^"]+)"/)?.at(1);
  if (!viewBox || !pathData) throw new Error('Not an icon SVG from `deno task icon`: it needs a viewBox and one path.');

  return { viewBox, pathData };
}

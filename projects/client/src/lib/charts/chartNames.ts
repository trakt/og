/** The charts that take a period as a path segment. `library` is the `collected` endpoint. */
export const periodChartNames = ['favorited', 'watched', 'library', 'played'] as const;

/** Every chart with a page so far. Later chart issues add theirs here. */
export const chartNames = ['trending', 'popular', 'anticipated', 'recommendations', ...periodChartNames] as const;

export type ChartName = (typeof chartNames)[number];
export type PeriodChartName = (typeof periodChartNames)[number];

/** OG's old paths for a chart. og redirects them. */
export const chartAliases = { recommended: 'favorited', collected: 'library' } as const;

export type ChartAlias = keyof typeof chartAliases;

export const isPeriodChart = (chart: ChartName): chart is PeriodChartName =>
  periodChartNames.some((name) => name === chart);

export const isChartAlias = (param: string): param is ChartAlias => Object.hasOwn(chartAliases, param);

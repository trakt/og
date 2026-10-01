import { type ChartAlias, type ChartName, chartNames, isChartAlias } from '../lib/charts/chartNames.ts';

/** A chart, or one of OG's old names for one, which the loader redirects. */
export function match(param: string): param is ChartName | ChartAlias {
  return chartNames.some((name) => name === param) || isChartAlias(param);
}

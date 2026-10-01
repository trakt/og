/**
 * OG's period options and how the under-title reads each one. The API also
 * takes `yearly`, but OG never offered it.
 */
const periodText = {
  daily: 'the last day',
  weekly: 'the last 7 days',
  monthly: 'the last 30 days',
  all: 'all time',
} as const;

export type ChartPeriod = keyof typeof periodText;

const isChartPeriod = (param: string): param is ChartPeriod => Object.hasOwn(periodText, param);

/** The period in the URL. Missing or unknown falls back to weekly, like OG. */
export const chartPeriod = (param: string | undefined): ChartPeriod =>
  param !== undefined && isChartPeriod(param) ? param : 'weekly';

export const chartPeriodText = (period: ChartPeriod) => periodText[period];

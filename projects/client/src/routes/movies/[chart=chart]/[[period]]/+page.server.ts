import { loadChart } from '../../../../lib/charts/loadChart.ts';

export const load = ({ fetch, locals, cookies, parent, url, params }) =>
  loadChart({
    fetch,
    token: locals.token,
    cookies,
    parent,
    url,
    type: 'movies',
    chart: params.chart,
    period: params.period,
  });

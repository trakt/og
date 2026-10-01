import type { ItemStats } from './ItemStats.ts';
import type { ItemStatsTarget } from './ItemStatsTarget.ts';

type Job = {
  target: ItemStatsTarget;
  visible: boolean;
  resolve: (stats: ItemStats | null) => void;
};

/** One queue/cache for the browser session. Visible rows jump ahead of pending sort-only requests. */
export function createItemStatsQueue({
  load,
  concurrency = 4,
}: {
  load: (target: ItemStatsTarget) => Promise<ItemStats | null>;
  concurrency?: number;
}) {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Stats concurrency must be positive.');
  const requests = new Map<string, Promise<ItemStats | null>>();
  const pending: Job[] = [];
  let active = 0;
  const key = ({ show, season, episode }: ItemStatsTarget) => `${show}/${season}/${episode ?? 'season'}`;

  function drain() {
    while (active < concurrency && pending.length > 0) {
      const visible = pending.findIndex((job) => job.visible);
      const job = pending.splice(visible < 0 ? 0 : visible, 1).at(0);
      if (!job) return;
      active++;
      // Catch network, parsing and synchronous loader failures; a failure stays empty for this session.
      Promise.resolve().then(() => load(job.target)).catch(() => null).then(job.resolve).finally(() => {
        active--;
        drain();
      });
    }
  }

  return {
    get(target: ItemStatsTarget, visible = false): Promise<ItemStats | null> {
      const id = key(target);
      const cached = requests.get(id);
      if (cached) {
        const job = pending.find((job) => key(job.target) === id);
        if (job && visible) job.visible = true;
        return cached;
      }
      const request = new Promise<ItemStats | null>((resolve) => pending.push({ target, visible, resolve }));
      requests.set(id, request);
      drain();
      return request;
    },
  };
}

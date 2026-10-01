type Job = {
  task: () => Promise<Response>;
  visible: boolean;
  attempts: number;
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
};

type CreateRequestQueueParams = {
  /** Requests in flight at once. */
  concurrency?: number;
  /** Requests started per `windowMs`, kept well under the API's 1,000 GETs per 5 minutes. */
  limit?: number;
  windowMs?: number;
  /** A 429 is retried this many times, after its `Retry-After`. */
  retries?: number;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
};

// Without a usable `Retry-After`, a 429 pauses the queue this long.
const FALLBACK_RETRY_MS = 10_000;

/** `Retry-After` in seconds or as an HTTP date, in milliseconds from `now`. */
function retryAfter(response: Response, now: number): number {
  const header = response.headers.get('Retry-After')?.trim() ?? '';
  const seconds = Number(header);
  if (header && Number.isFinite(seconds)) return Math.max(seconds * 1000, 0);
  const date = Date.parse(header);
  return Number.isNaN(date) ? FALLBACK_RETRY_MS : Math.max(date - now, 0);
}

/**
 * One queue for API reads that can come in bulk (the overlay's slices, show summaries, show catalogs). Visible work
 * jumps ahead of background work, at most `concurrency` run at once, starts are paced to `limit` per `windowMs`, and
 * a 429 pauses every request for its `Retry-After` before the same one is tried again. A task resolves with its
 * response, even a failed one; only a thrown error rejects.
 */
export function createRequestQueue({
  concurrency = 6,
  limit = 500,
  windowMs = 5 * 60_000,
  retries = 3,
  now = Date.now,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: CreateRequestQueueParams = {}) {
  const pending: Job[] = [];
  let starts: number[] = [];
  let active = 0;
  let pausedUntil = 0;
  let scheduled = false;

  const delay = () => {
    starts = starts.filter((at) => now() - at < windowMs);
    const paced = starts.length >= limit ? (starts.at(0) ?? 0) + windowMs - now() : 0;
    return Math.max(pausedUntil - now(), paced, 0);
  };

  const later = (ms: number) => {
    if (scheduled) return;
    scheduled = true;
    void wait(ms).then(() => {
      scheduled = false;
      drain();
    });
  };

  const run = async (job: Job) => {
    try {
      const response = await job.task();
      if (response.status === 429 && job.attempts < retries) {
        pausedUntil = Math.max(pausedUntil, now() + retryAfter(response, now()));
        pending.unshift({ ...job, attempts: job.attempts + 1 });
        return;
      }
      job.resolve(response);
    } catch (error) {
      job.reject(error);
    } finally {
      active--;
      drain();
    }
  };

  function drain() {
    while (active < concurrency && pending.length > 0) {
      const ms = delay();
      if (ms > 0) return later(ms);

      const visible = pending.findIndex((job) => job.visible);
      const job = pending.splice(visible < 0 ? 0 : visible, 1).at(0);
      if (!job) return;
      active++;
      starts = [...starts, now()];
      void run(job);
    }
  }

  return {
    /** Queues `task`. `visible` is for what's on screen now; everything else waits behind it. */
    run(task: () => Promise<Response>, { visible = true }: { visible?: boolean } = {}): Promise<Response> {
      return new Promise((resolve, reject) => {
        pending.push({ task, visible, attempts: 0, resolve, reject });
        drain();
      });
    },
  };
}

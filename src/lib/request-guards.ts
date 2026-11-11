/** Past this, a request a visitor is waiting on (checkout, the waitlist) is abandoned and shown as a network failure, with Try again. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** No answer within the timeout: shown as the same network failure as no connection at all. */
export class RequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`No answer within ${timeoutMs / 1000}s`);
    this.name = "RequestTimeoutError";
  }
}

/**
 * Runs `request` with a signal that aborts after `timeoutMs`, and rejects with RequestTimeoutError then even if `request`
 * hasn't settled (it waits on more than its fetch, or a body that never ends). `signal` (the caller going away) aborts
 * it too, rejecting with the signal's reason. The timer is always cleared once it settles.
 */
export async function withTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  { timeoutMs = REQUEST_TIMEOUT_MS, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  const stopped = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new RequestTimeoutError(timeoutMs));
    }, timeoutMs);
    cancel = () => {
      controller.abort();
      reject(signal?.reason);
    };
  });
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  const started = request(controller.signal);
  // Once the race is decided the loser may still reject (an aborted fetch): nothing is listening for it.
  started.catch(() => {});
  try {
    return await Promise.race([started, stopped]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

/**
 * At most one `run` at a time: a call while one is in flight gets that call's promise instead of starting another. The
 * flag is set synchronously, before `run` reaches its first await, so two clicks or submits in the same task (a double
 * click, or two buttons) make one request. It clears once `run` settles, unless `holdWhile` says the result keeps it
 * busy (the page is already on its way to Stripe).
 */
export function singleFlight<A extends unknown[], R>(run: (...args: A) => Promise<R>, { holdWhile }: { holdWhile?: (result: R) => boolean } = {}) {
  let current: Promise<R> | null = null;
  const call = (...args: A): Promise<R> => {
    if (current) return current;
    const started = run(...args);
    current = started;
    started.then(
      (result) => {
        if (current === started && !holdWhile?.(result)) current = null;
      },
      () => {
        if (current === started) current = null;
      },
    );
    return started;
  };
  // reset: the page came back (bfcache) after a run that held it, so nothing is in flight any more. A late settle of
  // that run can't free a newer one: each settle only clears its own.
  return Object.assign(call, { inFlight: () => current !== null, reset: () => void (current = null) });
}

type ErrorContext = Record<string, unknown>;
type ErrorHook = (error: unknown, context?: ErrorContext) => void;

const hooks: ErrorHook[] = [];

/**
 * Register an extra error sink. To wire Sentry, call
 * `registerErrorHook((e, ctx) => Sentry.captureException(e, { extra: ctx }))`
 * from `instrumentation.ts` / `instrumentation-client.ts`.
 */
export function registerErrorHook(hook: ErrorHook) {
  hooks.push(hook);
}

export function captureException(error: unknown, context?: ErrorContext) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[launchloop:error] ${message}`, context ?? {}, error);
  for (const hook of hooks) {
    try {
      hook(error, context);
    } catch {
      // A broken sink must never take the request down with it.
    }
  }
}

export function captureMessage(message: string, context?: ErrorContext) {
  console.warn(`[launchloop:warn] ${message}`, context ?? {});
}

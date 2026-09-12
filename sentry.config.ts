// Sentry stub — no-op unless SENTRY_DSN is set.
//
// To enable: `npm i @sentry/nextjs`, set SENTRY_DSN in .env.local, then
// replace the body of initSentry() with Sentry.init({ dsn, tracesSampleRate }).
// Until then every export below is a safe no-op so routes can import this
// module unconditionally without adding a dependency.

const dsn = process.env.SENTRY_DSN || "";

function enabled(): boolean {
  return dsn.length > 0;
}

export function initSentry(): void {
  // Stub: logs once in development so missing DSN is visible, silent in prod.
  if (!enabled() && process.env.NODE_ENV !== "production") {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: "debug", msg: "sentry.disabled", reason: "SENTRY_DSN not set" }));
  }
  // Real init (uncomment after installing @sentry/nextjs):
  // if (enabled()) { const Sentry = require("@sentry/nextjs"); Sentry.init({ dsn, tracesSampleRate: 0.1 }); }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function captureException(err: any, context?: Record<string, unknown>): void {
  if (!enabled()) return;
  // Real: require("@sentry/nextjs").captureException(err, { extra: context });
  void err;
  void context;
}

export function getSentryStatus(): { enabled: boolean; dsnConfigured: boolean } {
  return { enabled: enabled(), dsnConfigured: enabled() };
}

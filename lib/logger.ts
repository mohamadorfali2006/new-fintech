// Structured JSON logger — single shared logger for API routes and lib code.
//
// Output: one JSON object per line on stdout (info/warn/error) or stderr
// (error). Safe for serverless: no file handles, no background flush.
// Use `logger.child({ requestId })` per request for correlation.
//
// Levels: debug < info < warn < error. Controlled by LOG_LEVEL env
// (default: "info" in production, "debug" otherwise).

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function envLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || "").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export interface LogFields {
  msg: string;
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

function write(level: LogLevel, base: Record<string, unknown>, fields: LogFields): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[envLevel()]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "newfintech",
    env: process.env.NODE_ENV || "development",
    ...base,
    ...fields,
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export interface Logger {
  debug(fields: LogFields): void;
  info(fields: LogFields): void;
  warn(fields: LogFields): void;
  error(fields: LogFields): void;
  child(context: Record<string, unknown>): Logger;
}

function makeLogger(base: Record<string, unknown>): Logger {
  return {
    debug: (f) => write("debug", base, f),
    info: (f) => write("info", base, f),
    warn: (f) => write("warn", base, f),
    error: (f) => write("error", base, f),
    child: (ctx) => makeLogger({ ...base, ...ctx }),
  };
}

export const logger: Logger = makeLogger({});

/** Minimal request helper: logs method+route+status+duration on completion. */
export function logRequest(
  log: Logger,
  opts: { method: string; route: string; status: number; durationMs: number; userId?: string; requestId?: string }
): void {
  const level: LogLevel = opts.status >= 500 ? "error" : opts.status >= 400 ? "warn" : "info";
  write(level, {}, { msg: `${opts.method} ${opts.route} -> ${opts.status}`, ...opts });
}

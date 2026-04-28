type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const envLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase();
const minLevel: LogLevel =
  envLevel === "debug" || envLevel === "info" || envLevel === "warn" || envLevel === "error"
    ? envLevel
    : "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}

function safeError(error: unknown): { name?: string; message?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}

function write(level: LogLevel, event: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) {
    return;
  }
  const row = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(meta ?? {})
  };
  const line = JSON.stringify(row);
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(line);
    return;
  }
  if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(line);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(line);
}

export const logger = {
  debug: (event: string, meta?: Record<string, unknown>) => write("debug", event, meta),
  info: (event: string, meta?: Record<string, unknown>) => write("info", event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => write("warn", event, meta),
  error: (event: string, error?: unknown, meta?: Record<string, unknown>) =>
    write("error", event, {
      ...(meta ?? {}),
      ...(error !== undefined ? { error: safeError(error) } : {})
    })
};

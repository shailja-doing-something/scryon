type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    const entry = { level, message, timestamp: new Date().toISOString(), ...context };
    // In production, structured logs go to stdout for Railway log aggregation
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    const prefix = `[${level.toUpperCase()}]`;
    if (context) {
      console[level === "info" ? "log" : level](prefix, message, context);
    } else {
      console[level === "info" ? "log" : level](prefix, message);
    }
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};

import { isProduction } from '../config/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const REDACTED_KEY_PATTERN = /pass(word)?|token|secret|authorization|cookie|hash|uri|credential/i;

const REDACTED = '[redacted]';

const MAX_DEPTH = 4;

export class Logger {
  private readonly minLevel: number;

  constructor(minLevel: LogLevel = isProduction ? 'info' : 'debug') {
    this.minLevel = LEVEL_ORDER[minLevel];
  }

  public debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const safeContext = context ? this.redact(context, 0) : undefined;
    const line = isProduction
      ? this.formatJson(level, message, safeContext)
      : this.formatReadable(level, message, safeContext);

    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](line);
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= this.minLevel;
  }

  private formatJson(level: LogLevel, message: string, context: unknown): string {
    return this.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context ? { context } : {}),
    });
  }

  private formatReadable(level: LogLevel, message: string, context: unknown): string {
    const suffix = context ? ` ${this.stringify(context)}` : '';
    return `[${level}] ${message}${suffix}`;
  }

  private stringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private redact(value: unknown, depth: number): unknown {
    if (depth > MAX_DEPTH) {
      return '[max depth]';
    }

    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item, depth + 1));
    }

    if (value === null || typeof value !== 'object') {
      return value;
    }

    const output: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = REDACTED_KEY_PATTERN.test(key) ? REDACTED : this.redact(nested, depth + 1);
    }

    return output;
  }
}

export const logger = new Logger();

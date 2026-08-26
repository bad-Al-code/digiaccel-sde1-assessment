import mongoose from 'mongoose';
import { env } from '@/server/config/env';
import type { DatabaseConnection } from '@/server/database/connection';
import { HealthStatus, type HealthCheckResult, type IHealthCheck } from '../health.types';

const SLOW_PING_MS = 500;
const COLD_START_WINDOW_SECONDS = 10;

const READY_STATE_LABELS: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export class MongoHealthCheck implements IHealthCheck {
  public readonly name = 'mongodb';
  public readonly timeoutMs = 3_000;

  constructor(private readonly database: DatabaseConnection) {}

  public async check(): Promise<HealthCheckResult> {
    const startedAt = Date.now();

    if (!this.database.isConnected()) {
      return this.unhealthy(startedAt, 'Not connected to MongoDB');
    }

    try {
      await this.ping();
    } catch (error) {
      return this.unhealthy(startedAt, this.describe(error));
    }

    return this.fromLatency(Date.now() - startedAt);
  }

  private async ping(): Promise<void> {
    const admin = mongoose.connection.db?.admin();

    if (!admin) {
      throw new Error('No active database handle');
    }

    await admin.ping();
  }

  private fromLatency(latencyMs: number): HealthCheckResult {
    const withinColdStart = process.uptime() < COLD_START_WINDOW_SECONDS;
    const slow = latencyMs >= SLOW_PING_MS;

    return {
      name: this.name,
      status: slow && !withinColdStart ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
      latencyMs,
      detail: {
        database: env.MONGODB_DB_NAME,
        readyState: this.readyStateLabel(),
        ...(slow && withinColdStart ? { note: 'Slow ping during cold start' } : {}),
      },
    };
  }

  private unhealthy(startedAt: number, error: string): HealthCheckResult {
    return {
      name: this.name,
      status: HealthStatus.UNHEALTHY,
      latencyMs: Date.now() - startedAt,
      detail: { database: env.MONGODB_DB_NAME, readyState: this.readyStateLabel() },
      error,
    };
  }

  private readyStateLabel(): string {
    return READY_STATE_LABELS[this.database.readyState] ?? 'unknown';
  }

  private describe(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    if (/timed out|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|ServerSelection/i.test(message)) {
      return 'Cluster unreachable. Check the Atlas IP allowlist and that the cluster is not paused.';
    }

    if (/Authentication failed|bad auth/i.test(message)) {
      return 'Cluster rejected the credentials.';
    }

    return 'Ping failed';
  }
}

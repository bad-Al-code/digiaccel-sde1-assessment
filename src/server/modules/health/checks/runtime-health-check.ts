import v8 from 'node:v8';
import { HealthStatus, type HealthCheckResult, type IHealthCheck } from '../health.types';

const HIGH_HEAP_RATIO = 0.9;
const BYTES_PER_MB = 1024 * 1024;

export class RuntimeHealthCheck implements IHealthCheck {
  public readonly name = 'runtime';
  public readonly timeoutMs = 1_000;

  constructor(private readonly commitSha: string) {}

  public async check(): Promise<HealthCheckResult> {
    const startedAt = Date.now();
    const heapUsed = process.memoryUsage().heapUsed;
    const heapLimit = v8.getHeapStatistics().heap_size_limit;
    const ratio = heapLimit > 0 ? heapUsed / heapLimit : 0;

    return {
      name: this.name,
      status: ratio >= HIGH_HEAP_RATIO ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
      latencyMs: Date.now() - startedAt,
      detail: {
        nodeVersion: process.version,
        commit: this.commitSha,
        heapUsedMb: this.toMegabytes(heapUsed),
        heapLimitMb: this.toMegabytes(heapLimit),
        heapUsedPercent: Math.round(ratio * 100),
      },
    };
  }

  private toMegabytes(bytes: number): number {
    return Math.round((bytes / BYTES_PER_MB) * 10) / 10;
  }
}

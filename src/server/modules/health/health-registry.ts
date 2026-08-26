import {
  HealthStatus,
  type HealthCheckResult,
  type HealthReport,
  type IHealthCheck,
} from './health.types';

const STATUS_SEVERITY: Record<HealthStatus, number> = {
  [HealthStatus.HEALTHY]: 0,
  [HealthStatus.DEGRADED]: 1,
  [HealthStatus.UNHEALTHY]: 2,
};

export class HealthRegistry {
  constructor(
    private readonly checks: readonly IHealthCheck[],
    private readonly version: string,
    private readonly environment: string,
  ) {}

  public async runAll(): Promise<HealthReport> {
    const settled = await Promise.allSettled(
      this.checks.map((check) => this.runWithTimeout(check)),
    );

    const results = settled.map((outcome, index) =>
      outcome.status === 'fulfilled'
        ? outcome.value
        : this.toFailedResult(this.checks[index], outcome.reason),
    );

    return {
      status: this.aggregate(results),
      checks: results,
      uptimeSeconds: Math.round(process.uptime()),
      environment: this.environment,
      version: this.version,
      checkedAt: new Date().toISOString(),
    };
  }

  private async runWithTimeout(check: IHealthCheck): Promise<HealthCheckResult> {
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<HealthCheckResult>((resolve) => {
      timer = setTimeout(() => {
        resolve({
          name: check.name,
          status: HealthStatus.UNHEALTHY,
          latencyMs: Date.now() - startedAt,
          error: `Check exceeded ${check.timeoutMs}ms`,
        });
      }, check.timeoutMs);
    });

    try {
      return await Promise.race([check.check(), timeout]);
    } catch (error) {
      return this.toFailedResult(check, error, Date.now() - startedAt);
    } finally {
      clearTimeout(timer);
    }
  }

  private toFailedResult(
    check: IHealthCheck | undefined,
    reason: unknown,
    latencyMs = 0,
  ): HealthCheckResult {
    return {
      name: check?.name ?? 'unknown',
      status: HealthStatus.UNHEALTHY,
      latencyMs,
      error: this.toSafeMessage(reason),
    };
  }

  private aggregate(results: readonly HealthCheckResult[]): HealthStatus {
    return results.reduce<HealthStatus>(
      (worst, result) =>
        STATUS_SEVERITY[result.status] > STATUS_SEVERITY[worst] ? result.status : worst,
      HealthStatus.HEALTHY,
    );
  }

  private toSafeMessage(reason: unknown): string {
    if (reason instanceof Error) {
      return reason.message;
    }

    return typeof reason === 'string' ? reason : 'Check failed';
  }
}

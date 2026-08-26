export const HealthStatus = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  UNHEALTHY: 'UNHEALTHY',
} as const;

export type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus];

export interface HealthCheckResult {
  readonly name: string;
  readonly status: HealthStatus;
  readonly latencyMs: number;
  readonly detail?: Record<string, unknown>;
  readonly error?: string;
}

export interface IHealthCheck {
  readonly name: string;
  readonly timeoutMs: number;
  check(): Promise<HealthCheckResult>;
}

export interface HealthReport {
  readonly status: HealthStatus;
  readonly checks: HealthCheckResult[];
  readonly uptimeSeconds: number;
  readonly environment: string;
  readonly version: string;
  readonly checkedAt: string;
}

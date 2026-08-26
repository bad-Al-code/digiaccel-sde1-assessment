import type { NextResponse } from 'next/server';
import { ApiResponse } from '@/server/core/api-response';
import { ServiceUnavailableError } from '@/server/core/app-error';
import { env } from '@/server/config/env';
import type { HealthRegistry } from './health-registry';
import { HealthStatus } from './health.types';

export class HealthController {
  constructor(
    private readonly registry: HealthRegistry,
    private readonly version: string,
  ) {
    this.liveness = this.liveness.bind(this);
    this.readiness = this.readiness.bind(this);
  }

  public liveness(): NextResponse {
    return ApiResponse.ok({
      status: HealthStatus.HEALTHY,
      uptimeSeconds: Math.round(process.uptime()),
      environment: env.NODE_ENV,
      version: this.version,
      checkedAt: new Date().toISOString(),
    });
  }

  public async readiness(): Promise<NextResponse> {
    const report = await this.registry.runAll();

    if (report.status === HealthStatus.UNHEALTHY) {
      throw new ServiceUnavailableError(this.summarise(report.checks));
    }

    return ApiResponse.ok(report);
  }

  private summarise(checks: readonly { name: string; status: HealthStatus }[]): string {
    const failing = checks
      .filter((check) => check.status === HealthStatus.UNHEALTHY)
      .map((check) => check.name);

    return `Dependencies unavailable: ${failing.join(', ')}`;
  }
}

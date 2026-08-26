import { env, isProduction } from '@/server/config/env';
import { HealthStatus, type HealthCheckResult, type IHealthCheck } from '../health.types';

const REQUIRED_VARIABLES = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'APP_BASE_URL',
] as const;

export class ConfigHealthCheck implements IHealthCheck {
  public readonly name = 'configuration';
  public readonly timeoutMs = 1_000;

  public async check(): Promise<HealthCheckResult> {
    const startedAt = Date.now();
    const missing = REQUIRED_VARIABLES.filter((variable) => !env[variable]);

    if (missing.length > 0) {
      return {
        name: this.name,
        status: HealthStatus.UNHEALTHY,
        latencyMs: Date.now() - startedAt,
        error: `Missing configuration: ${missing.join(', ')}`,
      };
    }

    return {
      name: this.name,
      status: HealthStatus.HEALTHY,
      latencyMs: Date.now() - startedAt,
      detail: {
        environment: env.NODE_ENV,
        secureCookies: isProduction,
        variablesChecked: REQUIRED_VARIABLES.length,
      },
    };
  }
}

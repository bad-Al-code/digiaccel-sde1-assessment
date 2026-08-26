import type { NextRequest } from 'next/server';
import { RateLimitError } from './app-error';
import { isProduction } from '../config/env';
import { logger } from './logger';

export interface RateLimitPolicy {
  readonly name: string;
  readonly limit: number;
  readonly windowMs: number;
}

export const AUTH_ATTEMPTS: RateLimitPolicy = {
  name: 'auth',
  limit: 10,
  windowMs: 15 * 60 * 1000,
};

export const AUTHENTICATED_REQUESTS: RateLimitPolicy = {
  name: 'authenticated',
  limit: 100,
  windowMs: 60 * 1000,
};

interface Bucket {
  count: number;
  resetAt: number;
}

const PRUNE_THRESHOLD = 5_000;

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  public consume(request: NextRequest, policy: RateLimitPolicy, identifier?: string): void {
    let key: string;

    try {
      key = this.buildKey(request, policy, identifier);
    } catch (error) {
      logger.warn('Rate limit key derivation failed, allowing request', {
        policy: policy.name,
        error,
      });

      return;
    }

    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + policy.windowMs });
      this.pruneIfNeeded(now);

      return;
    }

    bucket.count += 1;

    if (bucket.count > policy.limit) {
      throw new RateLimitError((bucket.resetAt - now) / 1000);
    }
  }

  public reset(): void {
    this.buckets.clear();
  }

  private buildKey(
    request: NextRequest,
    policy: RateLimitPolicy,
    identifier: string | undefined,
  ): string {
    return `${policy.name}:${identifier ?? this.resolveClientIp(request)}`;
  }

  private resolveClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');

    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) {
        return this.normaliseIp(first);
      }
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return this.normaliseIp(realIp);
    }

    return isProduction ? 'unknown' : `local:${Math.random()}`;
  }

  private normaliseIp(value: string): string {
    return value.toLowerCase().split('%')[0] ?? value.toLowerCase();
  }

  private pruneIfNeeded(now: number): void {
    if (this.buckets.size < PRUNE_THRESHOLD) {
      return;
    }

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

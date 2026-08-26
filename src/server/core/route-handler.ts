import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import { ApiResponse } from './api-response';
import { AppError, toError } from './app-error';
import { HttpStatus } from './http-status';
import { logger } from './logger';
import { rateLimiter, type RateLimitPolicy } from './rate-limiter';
import { requestValidator } from './request-validator';

export type SessionResolver<TUser> = (request: NextRequest) => Promise<TUser>;

export interface RouteConfig<TBody, TQuery, TParams, TUser> {
  readonly body?: ZodType<TBody>;
  readonly query?: ZodType<TQuery>;
  readonly params?: ZodType<TParams>;
  readonly rateLimit?: RateLimitPolicy;
  readonly auth?: SessionResolver<TUser>;
}

export interface RouteContext<TBody, TQuery, TParams, TUser> {
  readonly request: NextRequest;
  readonly body: TBody;
  readonly query: TQuery;
  readonly params: TParams;
  readonly user: TUser;
}

type RouteHandler<TBody, TQuery, TParams, TUser> = (
  context: RouteContext<TBody, TQuery, TParams, TUser>,
) => Promise<NextResponse> | NextResponse;

interface SegmentData {
  readonly params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]>;
}

const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.';

export function createRouteHandler<
  TBody = undefined,
  TQuery = undefined,
  TParams = undefined,
  TUser = undefined,
>(
  config: RouteConfig<TBody, TQuery, TParams, TUser>,
  handler: RouteHandler<TBody, TQuery, TParams, TUser>,
) {
  return async function route(
    request: NextRequest,
    segmentData: SegmentData = {},
  ): Promise<NextResponse> {
    try {
      applyRateLimit(request, config.rateLimit);

      const user = await resolveUser(request, config.auth);
      const rawParams = await resolveParams(segmentData);

      const validated = await requestValidator.validate(request, config, rawParams);

      return await handler({
        request,
        body: validated.body,
        query: validated.query,
        params: validated.params,
        user,
      });
    } catch (thrown) {
      return toErrorResponse(thrown, request);
    }
  };
}

function applyRateLimit(request: NextRequest, policy: RateLimitPolicy | undefined): void {
  if (policy) {
    rateLimiter.consume(request, policy);
  }
}

async function resolveUser<TUser>(
  request: NextRequest,
  resolver: SessionResolver<TUser> | undefined,
): Promise<TUser> {
  if (!resolver) {
    return undefined as TUser;
  }

  return resolver(request);
}

async function resolveParams(segmentData: SegmentData): Promise<Record<string, string | string[]>> {
  const params = await segmentData.params;
  return params ?? {};
}

function toErrorResponse(thrown: unknown, request: NextRequest): NextResponse {
  if (isNextControlFlow(thrown)) {
    throw thrown;
  }

  if (thrown instanceof AppError) {
    logger.warn('Operational error', {
      status: thrown.statusCode,
      code: thrown.code,
      message: thrown.message,
      path: request.nextUrl.pathname,
    });

    return ApiResponse.failure(thrown);
  }

  const error = toError(thrown);

  logger.error('Unhandled error', {
    path: request.nextUrl.pathname,
    method: request.method,
    error,
  });

  return NextResponse.json(
    {
      success: false as const,
      message: GENERIC_ERROR_MESSAGE,
      code: HttpStatus.toReasonCode(HttpStatus.INTERNAL_SERVER_ERROR),
    },
    { status: HttpStatus.INTERNAL_SERVER_ERROR },
  );
}

function isNextControlFlow(thrown: unknown): boolean {
  if (typeof thrown !== 'object' || thrown === null) {
    return false;
  }

  const digest = (thrown as { digest?: unknown }).digest;

  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') ||
      digest === 'NEXT_NOT_FOUND' ||
      digest === 'NEXT_HTTP_ERROR_FALLBACK')
  );
}

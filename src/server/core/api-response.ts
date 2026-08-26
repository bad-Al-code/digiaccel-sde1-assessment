import { NextResponse } from 'next/server';
import { type AppError, RateLimitError, type FieldError } from './app-error';
import { HttpStatus } from './http-status';

export interface PaginationMeta {
  readonly total?: number;
  readonly hasMore?: boolean;
  readonly nextCursor?: string | null;
}

export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly message?: string;
  readonly meta?: PaginationMeta;
}

export interface ApiFailure {
  readonly success: false;
  readonly message: string;
  readonly code: string;
  readonly errors?: readonly FieldError[];
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

interface SuccessOptions {
  readonly message?: string;
  readonly meta?: PaginationMeta;
}

export class ApiResponse {
  private constructor() {
    // Static-only utility; never instantiated.
  }

  public static ok<T>(data: T, options: SuccessOptions = {}): NextResponse<ApiSuccess<T>> {
    return ApiResponse.success(data, HttpStatus.OK, options);
  }

  public static created<T>(data: T, options: SuccessOptions = {}): NextResponse<ApiSuccess<T>> {
    return ApiResponse.success(data, HttpStatus.CREATED, options);
  }

  public static failure(error: AppError): NextResponse<ApiFailure> {
    const body: ApiFailure = ApiResponse.buildFailureBody(error);
    const response = NextResponse.json(body, { status: error.statusCode });

    if (error instanceof RateLimitError) {
      response.headers.set('Retry-After', String(error.retryAfterSeconds));
    }

    return response;
  }

  public static meta(input: PaginationMeta): PaginationMeta {
    const meta: { total?: number; hasMore?: boolean; nextCursor?: string | null } = {};

    if (input.total !== undefined) meta.total = input.total;
    if (input.hasMore !== undefined) meta.hasMore = input.hasMore;
    if (input.nextCursor !== undefined) meta.nextCursor = input.nextCursor;

    return meta;
  }

  private static success<T>(
    data: T,
    status: number,
    options: SuccessOptions,
  ): NextResponse<ApiSuccess<T>> {
    return NextResponse.json(ApiResponse.buildSuccessBody(data, options), { status });
  }

  private static buildSuccessBody<T>(data: T, options: SuccessOptions): ApiSuccess<T> {
    const body: { success: true; data: T; message?: string; meta?: PaginationMeta } = {
      success: true,
      data,
    };

    if (options.message !== undefined) body.message = options.message;
    if (options.meta !== undefined) body.meta = options.meta;

    return body;
  }

  private static buildFailureBody(error: AppError): ApiFailure {
    const body: { success: false; message: string; code: string; errors?: readonly FieldError[] } =
      {
        success: false,
        message: error.message,
        code: error.code,
      };

    const fieldErrors = ApiResponse.readFieldErrors(error);
    if (fieldErrors && fieldErrors.length > 0) {
      body.errors = fieldErrors;
    }

    return body;
  }

  private static readFieldErrors(error: AppError): readonly FieldError[] | undefined {
    const candidate = (error as { fieldErrors?: readonly FieldError[] }).fieldErrors;

    return Array.isArray(candidate) ? candidate : undefined;
  }
}

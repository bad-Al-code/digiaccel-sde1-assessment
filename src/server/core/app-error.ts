import { HttpStatus } from './http-status';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean = true;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);

    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code ?? HttpStatus.toReasonCode(statusCode);

    Object.setPrototypeOf(this, new.target.prototype);

    Error.captureStackTrace(this, new.target);
  }
}

export class ValidationError extends AppError {
  public readonly fieldErrors: readonly FieldError[];

  constructor(message = 'Validation failed', fieldErrors: readonly FieldError[] = []) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR');
    this.fieldErrors = fieldErrors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    super(message, HttpStatus.UNAUTHORIZED, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', code = 'NOT_FOUND') {
    super(`${resource} not found`, HttpStatus.NOT_FOUND, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, HttpStatus.CONFLICT, code);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = 'Too many requests. Try again shortly.') {
    super(message, HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED');
    this.retryAfterSeconds = Math.max(0, Math.ceil(retryAfterSeconds));
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE');
  }
}

export function toError(thrown: unknown): Error {
  if (thrown instanceof Error) {
    return thrown;
  }

  return new Error(typeof thrown === 'string' ? thrown : JSON.stringify(thrown));
}

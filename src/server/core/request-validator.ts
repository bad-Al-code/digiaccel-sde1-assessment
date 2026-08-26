import type { NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import { ValidationError, type FieldError } from './app-error';

const MAX_BODY_BYTES = 100_000;

const POLLUTING_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface RequestSchemas<TBody, TQuery, TParams> {
  readonly body?: ZodType<TBody>;
  readonly query?: ZodType<TQuery>;
  readonly params?: ZodType<TParams>;
}

export interface ValidatedRequest<TBody, TQuery, TParams> {
  readonly body: TBody;
  readonly query: TQuery;
  readonly params: TParams;
}

export class RequestValidator {
  public async validate<TBody, TQuery, TParams>(
    request: NextRequest,
    schemas: RequestSchemas<TBody, TQuery, TParams>,
    rawParams: Record<string, string | string[]> = {},
  ): Promise<ValidatedRequest<TBody, TQuery, TParams>> {
    const errors: FieldError[] = [];

    const body = await this.parseBody(request, schemas.body, errors);
    const query = this.parseQuery(request, schemas.query, errors);
    const params = this.parseParams(rawParams, schemas.params, errors);

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    return {
      body: body as TBody,
      query: query as TQuery,
      params: params as TParams,
    };
  }

  private async parseBody<T>(
    request: NextRequest,
    schema: ZodType<T> | undefined,
    errors: FieldError[],
  ): Promise<unknown> {
    if (!schema) {
      return undefined;
    }

    const raw = await this.readJsonBody(request, errors);
    if (raw === undefined) {
      return undefined;
    }

    return this.runSchema(schema, raw, 'body', errors);
  }

  private async readJsonBody(
    request: NextRequest,
    errors: FieldError[],
  ): Promise<unknown | undefined> {
    const declaredLength = Number(request.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_BODY_BYTES) {
      errors.push({ field: 'body', message: 'Request body is too large' });

      return undefined;
    }

    let text: string;
    try {
      text = await request.text();
    } catch {
      errors.push({ field: 'body', message: 'Could not read request body' });

      return undefined;
    }

    if (text.length > MAX_BODY_BYTES) {
      errors.push({ field: 'body', message: 'Request body is too large' });
      return undefined;
    }

    if (text.trim() === '') {
      errors.push({ field: 'body', message: 'Request body is required' });
      return undefined;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      errors.push({ field: 'body', message: 'Invalid JSON body' });
      return undefined;
    }

    if (this.hasPollutingKey(text)) {
      errors.push({ field: 'body', message: 'Request body contains a forbidden key' });
      return undefined;
    }

    return parsed;
  }

  private hasPollutingKey(rawText: string): boolean {
    for (const key of POLLUTING_KEYS) {
      if (rawText.includes(`"${key}"`)) {
        return true;
      }
    }

    return false;
  }

  private parseQuery<T>(
    request: NextRequest,
    schema: ZodType<T> | undefined,
    errors: FieldError[],
  ): unknown {
    if (!schema) {
      return undefined;
    }

    const raw: Record<string, string | string[]> = {};

    for (const key of new Set(request.nextUrl.searchParams.keys())) {
      const values = request.nextUrl.searchParams.getAll(key);

      raw[key] = values.length > 1 ? values : (values[0] ?? '');
    }

    return this.runSchema(schema, raw, 'query', errors);
  }

  private parseParams<T>(
    rawParams: Record<string, string | string[]>,
    schema: ZodType<T> | undefined,
    errors: FieldError[],
  ): unknown {
    if (!schema) {
      return undefined;
    }

    return this.runSchema(schema, rawParams, 'params', errors);
  }

  private runSchema<T>(
    schema: ZodType<T>,
    value: unknown,
    source: string,
    errors: FieldError[],
  ): T | undefined {
    const result = schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    for (const issue of result.error.issues) {
      errors.push({
        field: issue.path.length > 0 ? issue.path.join('.') : source,
        message: issue.message,
      });
    }

    return undefined;
  }
}

export const requestValidator = new RequestValidator();

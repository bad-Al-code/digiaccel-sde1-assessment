import { ApiError, type FieldError } from './api-error';

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  errors?: FieldError[];
  meta?: Record<string, unknown>;
}

export interface Paged<T> {
  readonly items: T[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly nextCursor: string | null;
}

const REQUEST_TIMEOUT_MS = 20_000;

class ApiClient {
  private refreshInFlight: Promise<boolean> | null = null;

  public async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  public async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  public async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  public async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  public async getPaged<T>(path: string): Promise<Paged<T>> {
    const envelope = await this.send<T[]>('GET', path);
    const meta = envelope.meta ?? {};

    return {
      items: envelope.data ?? [],
      total: Number(meta.total ?? 0),
      hasMore: Boolean(meta.hasMore),
      nextCursor: (meta.nextCursor as string | null) ?? null,
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const envelope = await this.send<T>(method, path, body);

    return envelope.data as T;
  }

  private async send<T>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false,
  ): Promise<Envelope<T>> {
    const response = await this.fetchOrThrow(method, path, body);
    const envelope = await this.parse<T>(response);

    if (response.ok) {
      return envelope;
    }

    if (this.shouldRefresh(response.status, envelope.code, path, isRetry)) {
      const refreshed = await this.refreshOnce();

      if (refreshed) {
        return this.send<T>(method, path, body, true);
      }
    }

    throw new ApiError(
      response.status,
      envelope.code ?? 'REQUEST_FAILED',
      envelope.message ?? 'Something went wrong. Please try again.',
      envelope.errors ?? [],
    );
  }

  private async fetchOrThrow(method: string, path: string, body?: unknown): Promise<Response> {
    try {
      return await fetch(path, {
        method,
        credentials: 'include',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'You appear to be offline. Check your connection.');
    }
  }

  private async parse<T>(response: Response): Promise<Envelope<T>> {
    if (response.status === 204) {
      return { success: response.ok };
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      return { success: response.ok, message: 'Unexpected response from the server.' };
    }

    try {
      return (await response.json()) as Envelope<T>;
    } catch {
      return { success: false, message: 'Could not read the server response.' };
    }
  }

  private shouldRefresh(status: number, code: string | undefined, path: string, isRetry: boolean) {
    return (
      status === 401 && code === 'SESSION_EXPIRED' && !isRetry && !path.startsWith('/api/auth/')
    );
  }

  private async refreshOnce(): Promise<boolean> {
    this.refreshInFlight ??= this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });

    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();

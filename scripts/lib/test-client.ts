export interface ApiCall<T = unknown> {
  readonly status: number;
  readonly headers: Headers;
  readonly body: T;
  readonly raw: string;
}

export class TestClient {
  private readonly jar = new Map<string, string>();

  constructor(private readonly baseUrl: string) {}

  public async get<T = unknown>(path: string, headers: Record<string, string> = {}) {
    return this.send<T>('GET', path, undefined, headers);
  }

  public async post<T = unknown>(
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    return this.send<T>('POST', path, body, headers);
  }

  public async patch<T = unknown>(
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    return this.send<T>('PATCH', path, body, headers);
  }

  public async delete<T = unknown>(path: string, headers: Record<string, string> = {}) {
    return this.send<T>('DELETE', path, undefined, headers);
  }

  public async postRaw<T = unknown>(
    path: string,
    raw: string,
    headers: Record<string, string> = {},
  ) {
    return this.send<T>('POST', path, undefined, headers, raw);
  }

  public getCookie(name: string): string | null {
    return this.jar.get(name) ?? null;
  }

  public setCookie(name: string, value: string): void {
    this.jar.set(name, value);
  }

  public clearCookies(): void {
    this.jar.clear();
  }

  public snapshotCookies(): Map<string, string> {
    return new Map(this.jar);
  }

  public restoreCookies(snapshot: Map<string, string>): void {
    this.jar.clear();
    snapshot.forEach((value, key) => this.jar.set(key, value));
  }

  private async send<T>(
    method: string,
    path: string,
    body: unknown,
    headers: Record<string, string>,
    rawBody?: string,
  ): Promise<ApiCall<T>> {
    const requestHeaders: Record<string, string> = { ...headers };
    const cookieHeader = this.buildCookieHeader();

    if (cookieHeader) requestHeaders.cookie = cookieHeader;

    let payload: string | undefined = rawBody;

    if (payload === undefined && body !== undefined) {
      payload = JSON.stringify(body);
    }

    if (payload !== undefined && !requestHeaders['content-type']) {
      requestHeaders['content-type'] = 'application/json';
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      ...(payload === undefined ? {} : { body: payload }),
      signal: AbortSignal.timeout(30_000),
    });

    this.absorbCookies(response.headers);

    const raw = await response.text();
    let parsed: unknown = null;

    try {
      parsed = raw.length > 0 ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    return { status: response.status, headers: response.headers, body: parsed as T, raw };
  }

  private buildCookieHeader(): string {
    return [...this.jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  private absorbCookies(headers: Headers): void {
    const raw = headers.getSetCookie?.() ?? [];

    for (const entry of raw) {
      const [pair, ...attributes] = entry.split(';');
      const separator = pair?.indexOf('=') ?? -1;

      if (!pair || separator < 0) continue;

      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();

      const expired = attributes.some((attribute) => {
        const [key, attrValue] = attribute.split('=').map((part) => part.trim().toLowerCase());
        if (key === 'max-age') return Number(attrValue) <= 0;
        if (key === 'expires' && attrValue) return new Date(attrValue).getTime() <= Date.now();
        return false;
      });

      if (expired || value === '') {
        this.jar.delete(name);
      } else {
        this.jar.set(name, value);
      }
    }
  }
}

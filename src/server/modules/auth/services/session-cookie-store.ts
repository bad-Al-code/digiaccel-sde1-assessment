import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { env, isProduction } from '@/server/config/env';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, durationToSeconds } from '../auth.constants';
import type { TokenPair } from '../auth.types';

interface CookieOptions {
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: 'lax';
  readonly path: '/';
  readonly maxAge: number;
}

export class SessionCookieStore {
  public setSession(response: NextResponse, tokens: TokenPair): void {
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      tokens.accessToken,
      this.buildOptions(durationToSeconds(env.ACCESS_TOKEN_TTL)),
    );

    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      this.buildOptions(durationToSeconds(env.REFRESH_TOKEN_TTL)),
    );
  }

  public clearSession(response: NextResponse): void {
    for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]) {
      response.cookies.set(name, '', this.buildOptions(0));
    }
  }

  public readAccessToken(request: NextRequest): string | null {
    return request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  }

  public readRefreshToken(request: NextRequest): string | null {
    return request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
  }

  public async readAccessTokenFromStore(): Promise<string | null> {
    const store = await cookies();

    return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  }

  private buildOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge,
    };
  }
}

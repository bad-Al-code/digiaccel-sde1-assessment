import type { NextRequest } from 'next/server';
import { UnauthorizedError } from '@/server/core/app-error';
import { database } from '@/server/database/connection';
import type { AuthenticatedUser } from './auth.types';
import type { AuthService } from './services/auth.service';
import type { SessionCookieStore } from './services/session-cookie-store';
import type { JwtTokenService } from './services/token-service';

export class AuthGuard {
  constructor(
    private readonly tokenService: JwtTokenService,
    private readonly authService: AuthService,
    private readonly cookieStore: SessionCookieStore,
  ) {
    this.resolveUser = this.resolveUser.bind(this);
  }

  public async resolveUser(request: NextRequest): Promise<AuthenticatedUser> {
    return this.resolveFromToken(this.cookieStore.readAccessToken(request));
  }

  public async resolveOptionalUser(): Promise<AuthenticatedUser | null> {
    try {
      const token = await this.cookieStore.readAccessTokenFromStore();

      return await this.resolveFromToken(token);
    } catch {
      return null;
    }
  }

  private async resolveFromToken(token: string | null): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = this.tokenService.verifyAccessToken(token);

    await database.connect();

    return this.authService.getCurrentUser(payload.sub);
  }
}

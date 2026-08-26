import type { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/server/core/api-response';
import { UnauthorizedError } from '@/server/core/app-error';
import { hashFingerprint } from './auth.constants';
import type { AuthenticatedUser } from './auth.types';
import type { AuthResult, AuthService } from './services/auth.service';
import type { SessionCookieStore } from './services/session-cookie-store';
import type { GuestSessionBody, LoginBody, RegisterBody } from './auth.validator';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieStore: SessionCookieStore,
  ) {
    this.register = this.register.bind(this);
    this.guest = this.guest.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.refresh = this.refresh.bind(this);
    this.me = this.me.bind(this);
  }

  public async guest(request: NextRequest, body: GuestSessionBody): Promise<NextResponse> {
    const existing = this.cookieStore.readAccessToken(request);
    const fingerprintHash = body.fingerprint ? hashFingerprint(body.fingerprint) : null;

    if (existing) {
      const current = await this.authService.currentUserFromAccessToken(existing);

      if (current) {
        return ApiResponse.ok(current);
      }
    }

    const result = await this.authService.startGuestSession(fingerprintHash);

    return this.withSession(ApiResponse.created(result.user), result);
  }

  public async register(request: NextRequest, body: RegisterBody): Promise<NextResponse> {
    const guestUserId = await this.resolveGuestUserId(request);
    const result = await this.authService.register(body, guestUserId);

    return this.withSession(ApiResponse.created(result.user), result);
  }

  public async login(body: LoginBody): Promise<NextResponse> {
    const result = await this.authService.login(body);

    return this.withSession(ApiResponse.ok(result.user), result);
  }

  public async refresh(request: NextRequest): Promise<NextResponse> {
    const refreshToken = this.cookieStore.readRefreshToken(request);

    if (!refreshToken) {
      throw new UnauthorizedError('No session to refresh');
    }

    const result = await this.authService.refresh(refreshToken);

    return this.withSession(ApiResponse.ok(result.user), result);
  }

  public async logout(request: NextRequest): Promise<NextResponse> {
    await this.authService.logout(this.cookieStore.readRefreshToken(request));

    const response = ApiResponse.ok(null, { message: 'Signed out' });
    this.cookieStore.clearSession(response);

    return response;
  }

  public me(user: AuthenticatedUser): NextResponse {
    return ApiResponse.ok(user);
  }

  private async resolveGuestUserId(request: NextRequest): Promise<string | undefined> {
    const token = this.cookieStore.readAccessToken(request);

    if (!token) return undefined;

    const current = await this.authService.currentUserFromAccessToken(token);

    return current?.isGuest ? current.id : undefined;
  }

  private withSession(response: NextResponse, result: AuthResult): NextResponse {
    this.cookieStore.setSession(response, result.tokens);

    return response;
  }
}

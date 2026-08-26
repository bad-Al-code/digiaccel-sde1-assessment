import type { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/server/core/api-response';
import { UnauthorizedError } from '@/server/core/app-error';
import type { AuthenticatedUser } from './auth.types';
import type { AuthResult, AuthService } from './services/auth.service';
import type { SessionCookieStore } from './services/session-cookie-store';
import type { LoginBody, RegisterBody } from './auth.validator';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieStore: SessionCookieStore,
  ) {
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.refresh = this.refresh.bind(this);
    this.me = this.me.bind(this);
  }

  public async register(body: RegisterBody): Promise<NextResponse> {
    const result = await this.authService.register(body);

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

  private withSession(response: NextResponse, result: AuthResult): NextResponse {
    this.cookieStore.setSession(response, result.tokens);

    return response;
  }
}

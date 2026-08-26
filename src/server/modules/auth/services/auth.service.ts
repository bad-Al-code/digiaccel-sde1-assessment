import { createHash } from 'node:crypto';
import { ConflictError, UnauthorizedError } from '@/server/core/app-error';
import { logger } from '@/server/core/logger';
import type { User } from '@/types';
import type { AuthenticatedUser, IPasswordHasher, ITokenService, TokenPair } from '../auth.types';
import type { IUserRepository } from '../user.repository.types';

export interface RegisterInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export interface AuthResult {
  readonly user: User;
  readonly tokens: TokenPair;
}

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  public async startGuestSession(fingerprintHash: string | null): Promise<AuthResult> {
    const existing = fingerprintHash
      ? await this.userRepository.findGuestByFingerprint(fingerprintHash)
      : null;

    const user =
      existing ??
      (await this.userRepository.createGuest({
        name: 'Guest',
        fingerprintHash,
      }));

    const tokens = await this.issueSession(user.id);

    return { user, tokens };
  }

  public async register(input: RegisterInput, guestUserId?: string): Promise<AuthResult> {
    await this.assertEmailAvailable(input.email);

    const passwordHash = await this.passwordHasher.hash(input.password);
    const credentials = { name: input.name, email: input.email, passwordHash };

    const user = guestUserId
      ? await this.claimGuestAccount(guestUserId, credentials)
      : await this.userRepository.create(credentials);

    const tokens = await this.issueSession(user.id);

    return { user, tokens };
  }

  private async claimGuestAccount(
    guestUserId: string,
    credentials: { name: string; email: string; passwordHash: string },
  ): Promise<User> {
    try {
      return await this.userRepository.promoteGuest(guestUserId, credentials);
    } catch (error) {
      if (error instanceof ConflictError) throw error;

      return this.userRepository.create(credentials);
    }
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const candidate = await this.userRepository.findByEmailWithPassword(input.email);

    if (!candidate) {
      await this.passwordHasher.burn();
      throw this.invalidCredentials();
    }

    const matches = await this.passwordHasher.verify(input.password, candidate.passwordHash);

    if (!matches) {
      throw this.invalidCredentials();
    }

    const { passwordHash: _passwordHash, ...user } = candidate;
    const tokens = await this.issueSession(user.id);

    return { user, tokens };
  }

  public async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const stored = await this.userRepository.findByIdWithRefreshTokenHash(payload.sub);

    if (!stored) {
      throw new UnauthorizedError('Session is no longer valid');
    }

    const presented = this.hashToken(refreshToken);

    if (!stored.refreshTokenHash || stored.refreshTokenHash !== presented) {
      await this.userRepository.updateRefreshTokenHash(stored.id, null);
      logger.warn('Refresh token reuse detected, sessions cleared', { userId: stored.id });

      throw new UnauthorizedError('Session is no longer valid');
    }

    const { refreshTokenHash: _hash, ...user } = stored;
    const tokens = await this.issueSession(user.id);

    return { user, tokens };
  }

  public async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      await this.userRepository.updateRefreshTokenHash(payload.sub, null);
    } catch {
      // An invalid token means there is nothing to revoke.
    }
  }

  public async currentUserFromAccessToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const payload = this.tokenService.verifyAccessToken(token);

      return await this.getCurrentUser(payload.sub);
    } catch {
      return null;
    }
  }

  public async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('Session is no longer valid');
    }

    return { id: user.id, email: user.email, name: user.name, isGuest: user.isGuest };
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email);

    if (existing) {
      throw new ConflictError('Email already registered', 'EMAIL_ALREADY_REGISTERED');
    }
  }

  private async issueSession(userId: string): Promise<TokenPair> {
    const tokens = this.tokenService.issueTokenPair(userId);
    await this.userRepository.updateRefreshTokenHash(userId, this.hashToken(tokens.refreshToken));

    return tokens;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private invalidCredentials(): UnauthorizedError {
    return new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

import jwt, { type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import { env } from '@/server/config/env';
import { UnauthorizedError } from '@/server/core/app-error';
import {
  CLOCK_TOLERANCE_SECONDS,
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
} from '../auth.constants';
import type { ITokenService, TokenPair, TokenPayload, TokenType } from '../auth.types';

export class JwtTokenService implements ITokenService {
  public issueAccessToken(userId: string): string {
    return this.sign(userId, 'access', env.JWT_ACCESS_SECRET, env.ACCESS_TOKEN_TTL);
  }

  public issueRefreshToken(userId: string): string {
    return this.sign(userId, 'refresh', env.JWT_REFRESH_SECRET, env.REFRESH_TOKEN_TTL);
  }

  public issueTokenPair(userId: string): TokenPair {
    return {
      accessToken: this.issueAccessToken(userId),
      refreshToken: this.issueRefreshToken(userId),
    };
  }

  public verifyAccessToken(token: string): TokenPayload {
    return this.verify(token, 'access', env.JWT_ACCESS_SECRET);
  }

  public verifyRefreshToken(token: string): TokenPayload {
    return this.verify(token, 'refresh', env.JWT_REFRESH_SECRET);
  }

  private sign(userId: string, type: TokenType, secret: string, expiresIn: string): string {
    const options: SignOptions = {
      algorithm: JWT_ALGORITHM,
      expiresIn: expiresIn as NonNullable<SignOptions['expiresIn']>,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    };

    return jwt.sign({ sub: userId, type }, secret, options);
  }

  private verify(token: string, expectedType: TokenType, secret: string): TokenPayload {
    const options: VerifyOptions = {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    };

    let decoded: unknown;

    try {
      decoded = jwt.verify(token, secret, options);
    } catch (error) {
      throw this.toAuthError(error);
    }

    return this.assertPayload(decoded, expectedType);
  }

  private assertPayload(decoded: unknown, expectedType: TokenType): TokenPayload {
    if (typeof decoded !== 'object' || decoded === null) {
      throw new UnauthorizedError('Invalid token');
    }

    const { sub, type } = decoded as { sub?: unknown; type?: unknown };

    if (typeof sub !== 'string' || sub.length === 0 || type !== expectedType) {
      throw new UnauthorizedError('Invalid token');
    }

    return { sub, type: expectedType };
  }

  private toAuthError(error: unknown): UnauthorizedError {
    if (error instanceof jwt.TokenExpiredError) {
      return new UnauthorizedError('Session expired', 'SESSION_EXPIRED');
    }

    return new UnauthorizedError('Invalid token');
  }
}

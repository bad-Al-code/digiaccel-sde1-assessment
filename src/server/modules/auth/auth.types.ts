export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
  burn(): Promise<void>;
}

export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  readonly sub: string;
  readonly type: TokenType;
}

export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface ITokenService {
  issueAccessToken(userId: string): string;
  issueRefreshToken(userId: string): string;
  issueTokenPair(userId: string): TokenPair;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
}

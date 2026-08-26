import type { User } from '@/types';

export interface CreateUserInput {
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
}

export interface UserWithPassword extends User {
  readonly passwordHash: string;
}

export interface IUserRepository {
  findById(userId: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;

  create(input: CreateUserInput): Promise<User>;

  updateRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void>;

  findByIdWithRefreshTokenHash(
    userId: string,
  ): Promise<(User & { refreshTokenHash: string | null }) | null>;
}

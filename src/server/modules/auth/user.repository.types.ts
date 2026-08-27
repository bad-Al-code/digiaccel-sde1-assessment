import type { User } from '@/types';

export interface CreateUserInput {
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
}

export interface UserWithPassword extends User {
  readonly passwordHash: string;
}

export interface CreateGuestInput {
  readonly name: string;
  readonly fingerprintHash: string | null;
}

export interface IUserRepository {
  createGuest(input: CreateGuestInput): Promise<User>;

  findGuestByFingerprint(fingerprintHash: string): Promise<User | null>;

  promoteGuest(userId: string, input: CreateUserInput): Promise<User>;

  deleteGuest(userId: string): Promise<void>;

  findById(userId: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;

  create(input: CreateUserInput): Promise<User>;

  updateRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void>;

  findByIdWithRefreshTokenHash(
    userId: string,
  ): Promise<(User & { refreshTokenHash: string | null }) | null>;
}

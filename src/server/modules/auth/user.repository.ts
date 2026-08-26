import { BaseRepository } from '@/server/database/base-repository';
import { UserModel, type UserDocument } from '@/server/database/models/user.model';
import type { User } from '@/types';
import type { CreateUserInput, IUserRepository, UserWithPassword } from './user.repository.types';

export class UserRepository extends BaseRepository<UserDocument, User> implements IUserRepository {
  constructor() {
    super(UserModel);
  }

  public async findById(userId: string): Promise<User | null> {
    if (!this.isValidObjectId(userId)) {
      return null;
    }

    const document = await this.model.findById(userId).lean<UserDocument | null>();

    return document ? this.toDomain(document) : null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const document = await this.model
      .findOne({ email: this.normaliseEmail(email) })
      .lean<UserDocument | null>();

    return document ? this.toDomain(document) : null;
  }

  public async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    const document = await this.model
      .findOne({ email: this.normaliseEmail(email) })
      .select('+passwordHash')
      .lean<UserDocument | null>();

    return document ? { ...this.toDomain(document), passwordHash: document.passwordHash } : null;
  }

  public async findByIdWithRefreshTokenHash(
    userId: string,
  ): Promise<(User & { refreshTokenHash: string | null }) | null> {
    if (!this.isValidObjectId(userId)) {
      return null;
    }

    const document = await this.model
      .findById(userId)
      .select('+refreshTokenHash')
      .lean<UserDocument | null>();

    return document
      ? { ...this.toDomain(document), refreshTokenHash: document.refreshTokenHash ?? null }
      : null;
  }

  public async create(input: CreateUserInput): Promise<User> {
    try {
      const created = await this.model.create({
        name: input.name,
        email: this.normaliseEmail(input.email),
        passwordHash: input.passwordHash,
      });

      return this.toDomain(created.toObject<UserDocument>());
    } catch (error) {
      return this.handleWriteError(error, 'Email already registered');
    }
  }

  public async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    if (!this.isValidObjectId(userId)) {
      return;
    }

    await this.model.updateOne({ _id: userId }, { $set: { refreshTokenHash } });
  }

  protected toDomain(document: UserDocument): User {
    return {
      id: String(document._id),
      name: document.name,
      email: document.email,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }

  private normaliseEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}

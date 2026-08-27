import { NotFoundError } from '@/server/core/app-error';
import { BaseRepository } from '@/server/database/base-repository';
import { UserModel, type UserDocument } from '@/server/database/models/user.model';
import type { User } from '@/types';
import type {
  CreateGuestInput,
  CreateUserInput,
  IUserRepository,
  UserWithPassword,
} from './user.repository.types';

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

    if (!document || !document.passwordHash) {
      return null;
    }

    return { ...this.toDomain(document), passwordHash: document.passwordHash };
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

  public async reserveGuestTaskSlot(ownerId: string, maxTasks: number): Promise<boolean> {
    if (!this.isValidObjectId(ownerId)) {
      return false;
    }

    const reserved = await this.model
      .findOneAndUpdate(
        { _id: ownerId, isGuest: true, guestTaskCount: { $lt: maxTasks } },
        { $inc: { guestTaskCount: 1 } },
        { new: true },
      )
      .lean<UserDocument | null>();

    return reserved !== null;
  }

  public async releaseGuestTaskSlot(ownerId: string): Promise<void> {
    if (!this.isValidObjectId(ownerId)) {
      return;
    }

    await this.model.updateOne(
      { _id: ownerId, isGuest: true, guestTaskCount: { $gt: 0 } },
      { $inc: { guestTaskCount: -1 } },
    );
  }

  public async createGuest(input: CreateGuestInput): Promise<User> {
    const created = await this.model.create({
      name: input.name,
      email: null,
      passwordHash: null,
      isGuest: true,
      fingerprintHash: input.fingerprintHash,
    });

    return this.toDomain(created.toObject<UserDocument>());
  }

  public async findGuestByFingerprint(fingerprintHash: string): Promise<User | null> {
    const document = await this.model
      .findOne({ fingerprintHash, isGuest: true })
      .lean<UserDocument | null>();

    return document ? this.toDomain(document) : null;
  }

  public async deleteGuest(userId: string): Promise<void> {
    if (!this.isValidObjectId(userId)) {
      return;
    }

    await this.model.deleteOne({ _id: userId, isGuest: true });
  }

  public async promoteGuest(userId: string, input: CreateUserInput): Promise<User> {
    try {
      const updated = await this.model
        .findOneAndUpdate(
          { _id: userId, isGuest: true },
          {
            $set: {
              name: input.name,
              email: this.normaliseEmail(input.email),
              passwordHash: input.passwordHash,
              isGuest: false,
              fingerprintHash: null,
            },
          },
          { new: true },
        )
        .lean<UserDocument | null>();

      if (!updated) {
        throw new NotFoundError('Guest session');
      }

      return this.toDomain(updated);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;

      return this.handleWriteError(error, 'Email already registered');
    }
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
      email: document.email ?? null,
      isGuest: document.isGuest,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }

  private normaliseEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}

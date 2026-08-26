import { Types, type Model } from 'mongoose';
import { ConflictError, NotFoundError } from '../core/app-error';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const DUPLICATE_KEY_CODE = 11000;

export abstract class BaseRepository<TDocument, TDomain> {
  protected constructor(protected readonly model: Model<TDocument>) {}

  protected abstract toDomain(document: TDocument): TDomain;

  protected toDomainList(documents: TDocument[]): TDomain[] {
    return documents.map((document) => this.toDomain(document));
  }

  protected toObjectId(id: string, resource = 'Resource'): Types.ObjectId {
    if (!OBJECT_ID_PATTERN.test(id)) {
      throw new NotFoundError(resource);
    }

    return new Types.ObjectId(id);
  }

  protected isValidObjectId(id: string): boolean {
    return OBJECT_ID_PATTERN.test(id);
  }

  protected toIsoString(value: Date | null | undefined): string | null {
    return value ? value.toISOString() : null;
  }

  protected handleWriteError(error: unknown, conflictMessage: string): never {
    if (this.isDuplicateKeyError(error)) {
      throw new ConflictError(conflictMessage);
    }

    throw error;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
    );
  }
}

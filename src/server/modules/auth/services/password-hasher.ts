import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../auth.constants';
import type { IPasswordHasher } from '../auth.types';

export class BcryptPasswordHasher implements IPasswordHasher {
  private static readonly DUMMY_HASH =
    '$2b$12$C6UzMDM.H6dfI/f/IKcEe.Km5Q3lVXPB9rXK1kQ0aVJZ1qXjXqXWa';

  public async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_COST);
  }

  public async verify(plain: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plain, hash);
    } catch {
      return false;
    }
  }

  public async burn(): Promise<void> {
    try {
      await bcrypt.compare('not-a-real-password', BcryptPasswordHasher.DUMMY_HASH);
    } catch {
    }
  }
}

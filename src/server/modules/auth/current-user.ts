import { cache } from 'react';
import { authGuard } from './index';
import type { AuthenticatedUser } from './auth.types';

export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  return authGuard.resolveOptionalUser();
});

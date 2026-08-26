import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './services/auth.service';
import { BcryptPasswordHasher } from './services/password-hasher';
import { SessionCookieStore } from './services/session-cookie-store';
import { JwtTokenService } from './services/token-service';
import { UserRepository } from './user.repository';

const userRepository = new UserRepository();
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService();
const sessionCookieStore = new SessionCookieStore();

const authService = new AuthService(userRepository, passwordHasher, tokenService);

export const authController = new AuthController(authService, sessionCookieStore);
export const authGuard = new AuthGuard(tokenService, authService, sessionCookieStore);
export const sessionCookies = sessionCookieStore;

import type { JwtPayload } from './jwt-payload';

declare global {
  namespace Express {
    interface Request {
      /** Set by `AuthGuard` after Bearer JWT verification. */
      user?: JwtPayload;
    }
  }
}

export {};

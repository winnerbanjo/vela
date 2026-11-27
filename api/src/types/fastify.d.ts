import type { PrismaClient } from '@prisma/client';
import type { AuthPrincipal } from '../platform/auth.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient;
  }

  interface FastifyRequest {
    /** Set by the auth guards; absent on public routes. */
    auth?: AuthPrincipal;
  }
}

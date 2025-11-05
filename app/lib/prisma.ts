// app/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create a singleton Prisma client
export const prisma =
  global.prisma ??
  new PrismaClient({
    log: ['query'], // optional: remove in production
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

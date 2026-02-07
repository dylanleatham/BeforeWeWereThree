import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
// Prevents multiple instances during hot reload in development
// See: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

/**
 * Gracefully disconnect from database
 * Call this during server shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  await db.$disconnect();
}

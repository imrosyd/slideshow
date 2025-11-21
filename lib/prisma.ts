// Conditional / lazy Prisma client loader
// Prisma 7 can be stricter about environment configuration. To avoid
// application startup/runtime errors when `DATABASE_URL` is intentionally
// left empty (e.g. using a Supabase-only fallback), we only import and
// instantiate `PrismaClient` when a non-empty `DATABASE_URL` is present.

declare global {
  // allow global `var` declarations to reuse Prisma client in dev
  // eslint-disable-next-line no-var
  var prisma: any | undefined;
}

const hasDatabaseUrl = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '');

let _prisma: any;

if (hasDatabaseUrl) {
  // Use require to avoid top-level static import; this prevents Prisma
  // package from being evaluated when DATABASE_URL is not set.
  // This is compatible with CommonJS environments used in this project.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client');

  _prisma = global.prisma || new PrismaClient({ log: ['query'] });

  if (process.env.NODE_ENV !== 'production') {
    global.prisma = _prisma;
  }
} else {
  // Provide a helpful proxy object so callers that accidentally access
  // `prisma` without a configured DATABASE_URL receive a clear error.
  const missingMsg = `Prisma client not initialized: set DATABASE_URL in your .env to enable Prisma (Prisma 7 requires a valid DATABASE_URL).`;
  _prisma = new Proxy({}, {
    get() {
      throw new Error(missingMsg);
    },
    apply() {
      throw new Error(missingMsg);
    }
  });
}

export const prisma: any = _prisma;

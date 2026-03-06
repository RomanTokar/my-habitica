import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Local dev fallback — not used in production where DATABASE_URL is always set
    url: process.env.DATABASE_URL ?? 'postgresql://habitica:habitica@localhost:5432/habitica',
  },
} satisfies Config;

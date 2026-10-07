// Test-only stand-in for '@/db/client': the same drizzle schema and migrations
// on an in-memory better-sqlite3 database (Node), instead of expo-sqlite.
//   jest.mock('@/db/client', () => require('@/test/sqliteDb').createTestDbModule());
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as schema from '@/db/schema';

export function createTestDbModule() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const dir = join(__dirname, '..', 'db', 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    for (const stmt of readFileSync(join(dir, file), 'utf8').split('--> statement-breakpoint')) {
      if (stmt.trim()) sqlite.exec(stmt);
    }
  }
  return { db: drizzle(sqlite, { schema }), useDatabaseMigrations: () => ({ success: true }) };
}

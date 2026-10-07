import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import migrations from './migrations/migrations';
import * as schema from './schema';

const expoDb = openDatabaseSync('mettle.db', { enableChangeListener: true });
expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });

/** Runs pending migrations on app start. Gate rendering on `success`. */
export function useDatabaseMigrations() {
  return useMigrations(db, migrations);
}

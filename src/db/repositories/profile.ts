import { asc, eq } from 'drizzle-orm';

import { db } from '../client';
import { newId } from '../ids';
import { bodyweightLogs, profile } from '../schema';

export const PROFILE_ID = 'me';

export type ProfileRow = typeof profile.$inferSelect;
export type BodyweightRow = typeof bodyweightLogs.$inferSelect;

export function getProfile(): ProfileRow | null {
  return db.select().from(profile).where(eq(profile.id, PROFILE_ID)).get() ?? null;
}

export function createProfile(values: Omit<typeof profile.$inferInsert, 'id' | 'createdAt'>, bodyweightKg: number) {
  db.transaction((tx) => {
    tx.insert(profile).values({ ...values, id: PROFILE_ID }).run();
    tx.insert(bodyweightLogs).values({ id: newId(), weightKg: bodyweightKg, loggedAt: new Date() }).run();
  });
}

export function updateProfile(patch: Partial<Omit<typeof profile.$inferInsert, 'id' | 'createdAt'>>) {
  db.update(profile).set(patch).where(eq(profile.id, PROFILE_ID)).run();
}

export function listBodyweight(): BodyweightRow[] {
  return db.select().from(bodyweightLogs).orderBy(asc(bodyweightLogs.loggedAt)).all();
}

export function addBodyweight(weightKg: number, at = new Date()) {
  db.insert(bodyweightLogs).values({ id: newId(), weightKg, loggedAt: at }).run();
}

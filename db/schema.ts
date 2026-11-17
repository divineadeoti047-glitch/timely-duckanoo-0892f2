import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
export const browserBackups = pgTable('daystar_browser_backups', {
  ownerHash: text('owner_hash').primaryKey(),
  payload: jsonb('payload').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

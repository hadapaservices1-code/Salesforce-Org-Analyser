import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orgs = pgTable('orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  orgId: text('org_id').notNull(),
  orgName: text('org_name').notNull(),
  instanceUrl: text('instance_url').notNull(),
  edition: text('edition').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const scans = pgTable('scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  rawJson: jsonb('raw_json').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orgs: many(orgs),
}));

export const orgsRelations = relations(orgs, ({ one, many }) => ({
  user: one(users, {
    fields: [orgs.userId],
    references: [users.id],
  }),
  scans: many(scans),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  org: one(orgs, {
    fields: [scans.orgId],
    references: [orgs.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Org = typeof orgs.$inferSelect;
export type Scan = typeof scans.$inferSelect;

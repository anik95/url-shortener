import { sql } from 'drizzle-orm';
import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core';

export const urls = pgTable('urls', {
  id: uuid()
    .primaryKey()
    .default(sql`uuidv7()`),
  originalUrl: text('original_url').notNull(),
  shortCode: text('short_code').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clicks = pgTable(
  'clicks',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    urlId: uuid('url_id')
      .notNull()
      .references(() => urls.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('clicks_url_id_created_at_idx').on(table.urlId, table.createdAt),
  ], // convention for index is tableName_columnName_idx
);

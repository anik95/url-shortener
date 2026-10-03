import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.js';

export const relations = defineRelations(schema, (r) => ({
  urls: {
    clicks: r.many.clicks(),
  },
  clicks: {
    url: r.one.urls({
      from: r.clicks.urlId,
      to: r.urls.id,
      optional: false,
    }),
  },
}));

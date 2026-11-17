import { randomBytes, createHash } from 'node:crypto';
import { drizzle } from 'drizzle-orm/netlify-db';
import { eq } from 'drizzle-orm';
import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
const backups = pgTable('daystar_browser_backups', {
  ownerHash: text('owner_hash').primaryKey(), payload: jsonb('payload').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
let database;
export default async function handler(request) {
  const url = new URL(request.url);
  const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
  const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (url.pathname !== '/api/daystar/backup') return respond({ error: 'Not found' }, 404);
  if (!['GET', 'POST'].includes(request.method)) return respond({ error: 'Method not allowed' }, 405);
  if (request.method === 'POST' && (request.headers.get('origin') !== url.origin || !request.headers.get('content-type')?.startsWith('application/json'))) return respond({ error: 'Invalid origin or content type' }, 403);
  let owner = request.headers.get('cookie')?.match(/(?:^|;\s*)daystar_backup=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!owner) {
    if (request.method === 'GET') return respond({ error: 'No backup for this browser' }, 404);
    owner = randomBytes(32).toString('hex');
    headers['Set-Cookie'] = `daystar_backup=${owner}; HttpOnly; Secure; SameSite=Strict; Path=/api/daystar; Max-Age=31536000`;
  }
  const ownerHash = createHash('sha256').update(owner).digest('hex');
  try {
    database ??= drizzle();
    if (request.method === 'GET') {
      const [record] = await database.select().from(backups).where(eq(backups.ownerHash, ownerHash));
      return record ? respond(record.payload) : respond({ error: 'No backup' }, 404);
    }
    const reader = request.body?.getReader();
    if (!reader) return respond({ error: 'Missing body' }, 400);
    let size = 0; const chunks = [];
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 8 * 1024 * 1024) { await reader.cancel(); return respond({ error: 'Backup too large' }, 413); }
      chunks.push(Buffer.from(value));
    }
    let payload;
    try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return respond({ error: 'Invalid JSON' }, 400); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !payload.checks || !payload.notes) return respond({ error: 'Invalid DAYSTAR backup' }, 400);
    await database.insert(backups).values({ ownerHash, payload }).onConflictDoUpdate({ target: backups.ownerHash, set: { payload, updatedAt: new Date() } });
    return respond({ saved: true });
  } catch { return respond({ error: 'Backup temporarily unavailable' }, 503); }
}
export const config = { path: '/api/daystar/*' };

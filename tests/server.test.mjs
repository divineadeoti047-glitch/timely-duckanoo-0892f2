import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/server/index.mjs';
test('backup endpoint isolates browser access and rejects cross-origin writes',async()=>{
 assert.equal((await handler(new Request('https://daystar.test/api/daystar/backup'))).status,404);
 assert.equal((await handler(new Request('https://daystar.test/api/daystar/backup',{method:'DELETE'}))).status,405);
 assert.equal((await handler(new Request('https://daystar.test/api/daystar/backup',{method:'POST',headers:{origin:'https://another.test','content-type':'application/json'},body:'{}'}))).status,403);
 assert.equal((await handler(new Request('https://daystar.test/api/other'))).status,404);
});

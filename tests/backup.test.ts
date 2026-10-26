import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { dbService, LOCAL_STORAGE_KEYS, setLocal, getLocal, setGasUrl } from '../services/dbService';

const storage = new Map<string, string>();
const originalFetch = globalThis.fetch;
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}, configurable: true });

beforeEach(() => {
  storage.clear();
  setGasUrl('https://example.test/exec');
  localStorage.setItem(LOCAL_STORAGE_KEYS.lastBackup, '2026-01-01T00:00:00.000Z');
});
afterEach(() => { globalThis.fetch = originalFetch; });

test('successful backup sends every collection and stores a directly readable date', async () => {
  setLocal(LOCAL_STORAGE_KEYS.foodLogs,[{id:'food',foodName:'飯',timestamp:'2026-10-26T04:00:00Z',calories:300,thumbnail:'data:image/jpeg;base64,dGVzdA=='}]);
  localStorage.setItem('hg_jog_reports_v1',JSON.stringify([{id:'pose',createdAt:'2026-10-26T04:00:00Z'}]));
  setLocal(LOCAL_STORAGE_KEYS.profile,{name:'Test'});
  globalThis.fetch = async (_url, options) => {
    const payload = JSON.parse(String(options?.body));
    assert.equal(payload.action, 'backup_snapshot_v3');
    assert.ok(payload.data.data.hg_foodLogs[0].thumbnail);
    assert.equal(payload.data.data.hg_jog_reports_v1[0].id,'pose');
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload.data)));
    return Response.json({status:'success',protocol:3,backupId:'Backup_test',digest:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')});
  };
  assert.equal(await dbService.backupAllToCloud(), true);
  assert.ok(Number.isFinite(Date.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.lastBackup)!)));
  assert.notEqual(localStorage.getItem(LOCAL_STORAGE_KEYS.lastBackup), '2026-01-01T00:00:00.000Z');
});

for (const scenario of ['unsupported', 'network', 'http', 'invalid JSON', 'missing status']) {
  test(`${scenario} failure preserves backup date and never performs partial fallback`, async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      if (scenario === 'network') throw new Error('Failed to fetch');
      if (scenario === 'http') return Response.json({ status: 'success' }, { status: 503 });
      if (scenario === 'invalid JSON') return new Response('{', { headers: { 'Content-Type': 'application/json' } });
      return Response.json(scenario === 'unsupported' ? { status: 'error', message: 'Unknown action' } : {});
    };
    await assert.rejects(dbService.backupAllToCloud());
    assert.equal(calls, 1);
    assert.equal(localStorage.getItem(LOCAL_STORAGE_KEYS.lastBackup), '2026-01-01T00:00:00.000Z');
  });
}

test('legacy JSON-encoded backup timestamps remain readable', () => {
  setLocal(LOCAL_STORAGE_KEYS.lastBackup, '2026-01-01T00:00:00.000Z');
  const date = getLocal(LOCAL_STORAGE_KEYS.lastBackup, localStorage.getItem(LOCAL_STORAGE_KEYS.lastBackup) || '');
  assert.equal(date, '2026-01-01T00:00:00.000Z');
});

test('forged success without matching digest never marks cloud backup complete',async()=>{
 const previous=localStorage.getItem(LOCAL_STORAGE_KEYS.lastBackup);
 globalThis.fetch=async()=>Response.json({status:'success',protocol:3,backupId:'Backup_fake',digest:'wrong'});
 await assert.rejects(dbService.backupAllToCloud());assert.equal(localStorage.getItem(LOCAL_STORAGE_KEYS.lastBackup),previous);
});

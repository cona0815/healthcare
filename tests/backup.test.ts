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
  for (const key of ['foodLogs', 'reports', 'workouts', 'appointments', 'recipes', 'workoutPlan', 'vitals'] as const) {
    setLocal(LOCAL_STORAGE_KEYS[key], [{ id: key }]);
  }
  setLocal(LOCAL_STORAGE_KEYS.profile, { name: 'Test' });
  globalThis.fetch = async (_url, options) => {
    const payload = JSON.parse(String(options?.body));
    assert.equal(payload.action, 'backup_all');
    assert.equal(Object.keys(payload.data).length, 8);
    assert.equal(payload.data.vitals[0].id, 'vitals');
    return Response.json({ status: 'success' });
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

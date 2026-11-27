import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const OriginalClient = pg.Client;

class MockClient {
  static instances = [];
  static next = {};

  constructor(config) {
    this.config = config;
    this.calls = [];
    this.options = MockClient.next;
    MockClient.next = {};
    MockClient.instances.push(this);
  }

  async connect() {
    this.calls.push(['connect']);
    if (this.options.connectError) throw this.options.connectError;
  }

  async query(sql, params) {
    this.calls.push(['query', sql, params]);
    if (sql === 'BEGIN READ ONLY' && this.options.beginError) throw this.options.beginError;
    if (typeof sql === 'string' && sql.includes('transaction_read_only')) {
      if (this.options.verificationError) throw this.options.verificationError;
      return this.options.verificationResult ?? { rows: [this.options.verificationRow] };
    }
    if (typeof sql === 'string' && sql.includes('FROM information_schema.columns')) {
      return { rows: this.options.metadataRows ?? [{ table_name: 'widgets', column_name: 'id' }] };
    }
    return { rows: [] };
  }

  async end() {
    this.calls.push(['end']);
    if (this.options.endError) throw this.options.endError;
  }
}

test.before(() => { pg.Client = MockClient; });
test.after(() => {
  pg.Client = OriginalClient;
  delete process.env.DIAGNOSTIC_DB_ENABLED;
  delete process.env.DIAGNOSTIC_READONLY_DATABASE_URL;
});

test.beforeEach(() => {
  MockClient.instances = [];
  MockClient.next = {};
});

const moduleUrl = '../src/db/schemaInspection.js';
const validUrl = 'postgresql://diagnostic_reader:unused@localhost:5432/testdb';
const validSafetyRow = {
  role_name: 'diagnostic_reader',
  transaction_read_only: 'on',
  rolsuper: false,
  rolcreaterole: false,
  rolcreatedb: false,
  has_write_privilege: false,
};

async function loadInspection() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

function enableInspection() {
  process.env.DIAGNOSTIC_DB_ENABLED = 'true';
  process.env.DIAGNOSTIC_READONLY_DATABASE_URL = validUrl;
}

function hasMetadataQuery(client) {
  return client.calls.some(([kind, sql]) => kind === 'query' && typeof sql === 'string' && sql.includes('FROM information_schema.columns'));
}

function assertRolledBackAndClosed(client) {
  assert.ok(client.calls.some(([kind, sql]) => kind === 'query' && sql === 'ROLLBACK'), 'expected rollback attempt');
  assert.ok(client.calls.some(([kind]) => kind === 'end'), 'expected client cleanup');
  assert.equal(hasMetadataQuery(client), false, 'metadata query must not run on a failed inspection');
}

test('inspection is disabled unless explicitly enabled and has dedicated config', async () => {
  const { inspectTableColumns } = await loadInspection();
  delete process.env.DIAGNOSTIC_DB_ENABLED;
  process.env.DIAGNOSTIC_READONLY_DATABASE_URL = validUrl;
  await assert.rejects(inspectTableColumns(['widgets']), /disabled/);
  assert.equal(MockClient.instances.length, 0);

  process.env.DIAGNOSTIC_DB_ENABLED = 'true';
  delete process.env.DIAGNOSTIC_READONLY_DATABASE_URL;
  await assert.rejects(inspectTableColumns(['widgets']), /dedicated diagnostic read-only connection/);
  assert.equal(MockClient.instances.length, 0);
});

test('missing or malformed dedicated URL fails before creating a client', async (t) => {
  const { inspectTableColumns } = await loadInspection();
  for (const value of ['', 'not a URL', 'https://reader:password@example.test/db']) {
    await t.test(JSON.stringify(value), async () => {
      process.env.DIAGNOSTIC_DB_ENABLED = 'true';
      if (value) process.env.DIAGNOSTIC_READONLY_DATABASE_URL = value;
      else delete process.env.DIAGNOSTIC_READONLY_DATABASE_URL;
      await assert.rejects(inspectTableColumns(['widgets']), /dedicated diagnostic read-only connection|configuration is invalid/);
      assert.equal(MockClient.instances.length, 0);
    });
  }
});

test('connection failure fails closed, attempts rollback, and closes the client', async () => {
  enableInspection();
  MockClient.next = { connectError: new Error('connect failed') };
  const { inspectTableColumns } = await loadInspection();
  await assert.rejects(inspectTableColumns(['widgets']), /connect failed/);
  assertRolledBackAndClosed(MockClient.instances[0]);
});

test('BEGIN READ ONLY failure fails closed, attempts rollback, and closes the client', async () => {
  enableInspection();
  MockClient.next = { beginError: new Error('read-only begin failed') };
  const { inspectTableColumns } = await loadInspection();
  await assert.rejects(inspectTableColumns(['widgets']), /read-only begin failed/);
  const client = MockClient.instances[0];
  assert.ok(client.calls.some(([kind, sql]) => kind === 'query' && sql === 'BEGIN READ ONLY'));
  assertRolledBackAndClosed(client);
});

test('verification query failure fails closed, attempts rollback, and closes the client', async () => {
  enableInspection();
  MockClient.next = { verificationError: new Error('verification query failed') };
  const { inspectTableColumns } = await loadInspection();
  await assert.rejects(inspectTableColumns(['widgets']), /verification query failed/);
  assertRolledBackAndClosed(MockClient.instances[0]);
});

test('missing or invalid verification values fail closed before metadata lookup', async (t) => {
  const invalidRows = [
    ['no row', null],
    ['empty result', undefined],
    ['missing role name', { ...validSafetyRow, role_name: undefined }],
    ['empty role name', { ...validSafetyRow, role_name: '' }],
    ['transaction is not read-only', { ...validSafetyRow, transaction_read_only: 'off' }],
    ['missing transaction verification', { ...validSafetyRow, transaction_read_only: undefined }],
    ['superuser', { ...validSafetyRow, rolsuper: true }],
    ['missing superuser verification', { ...validSafetyRow, rolsuper: undefined }],
    ['role creation privilege', { ...validSafetyRow, rolcreaterole: true }],
    ['database creation privilege', { ...validSafetyRow, rolcreatedb: true }],
    ['write privilege', { ...validSafetyRow, has_write_privilege: true }],
    ['missing write privilege verification', { ...validSafetyRow, has_write_privilege: undefined }],
  ];

  for (const [name, row] of invalidRows) {
    await t.test(name, async () => {
      enableInspection();
      MockClient.next = { verificationRow: row };
      const { inspectTableColumns } = await loadInspection();
      await assert.rejects(inspectTableColumns(['widgets']), /failed read-only verification/);
      assertRolledBackAndClosed(MockClient.instances[0]);
    });
  }
});

test('metadata is queried only after verification succeeds', async () => {
  enableInspection();
  MockClient.next = { verificationRow: validSafetyRow, metadataRows: [{ table_name: 'widgets', column_name: 'id' }] };
  const { inspectTableColumns } = await loadInspection();
  const rows = await inspectTableColumns(['widgets']);
  const client = MockClient.instances[0];
  const verificationIndex = client.calls.findIndex(([, sql]) => typeof sql === 'string' && sql.includes('transaction_read_only'));
  const metadataIndex = client.calls.findIndex(([, sql]) => typeof sql === 'string' && sql.includes('FROM information_schema.columns'));
  assert.ok(verificationIndex >= 0 && metadataIndex > verificationIndex);
  assert.deepEqual(rows, [{ table_name: 'widgets', column_name: 'id' }]);
  assert.ok(client.calls.some(([, sql]) => sql === 'COMMIT'));
  assert.ok(client.calls.some(([kind]) => kind === 'end'));
});

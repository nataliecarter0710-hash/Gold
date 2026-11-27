import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const OriginalClient = pg.Client;

class MockClient {
  static instances = [];

  constructor(config) {
    this.config = config;
    this.calls = [];
    this.rows = null;
    this.fail = {};
    MockClient.instances.push(this);
  }

  async connect() {
    this.calls.push(['connect']);
    if (this.fail.connect) throw this.fail.connect;
  }

  async query(sql, params) {
    this.calls.push(['query', sql, params]);
    if (this.fail[sql]) throw this.fail[sql];
    if (typeof sql === 'string' && sql.includes('transaction_read_only')) {
      return { rows: [this.rows] };
    }
    if (typeof sql === 'string' && sql.includes('FROM information_schema.columns')) {
      return { rows: this.metadataRows || [] };
    }
    return { rows: [] };
  }

  async end() {
    this.calls.push(['end']);
  }
}

test.before(() => { pg.Client = MockClient; });
test.after(() => { pg.Client = OriginalClient; });

const moduleUrl = '../src/db/schemaInspection.js';

async function loadInspection() {
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

function validSafetyRow(overrides = {}) {
  return {
    role_name: 'diagnostic_reader',
    transaction_read_only: 'on',
    rolsuper: false,
    rolcreaterole: false,
    rolcreatedb: false,
    has_write_privilege: false,
    ...overrides,
  };
}

function configureValidEnvironment() {
  process.env.DIAGNOSTIC_DB_ENABLED = 'true';
  process.env.DIAGNOSTIC_READONLY_DATABASE_URL = 'postgresql://diagnostic_reader:unused@localhost:5432/testdb';
}

test('fails closed when diagnostics are disabled or dedicated config is missing', async () => {
  const { inspectTableColumns } = await loadInspection();

  delete process.env.DIAGNOSTIC_DB_ENABLED;
  await assert.rejects(inspectTableColumns(['widgets']), /disabled/);

  process.env.DIAGNOSTIC_DB_ENABLED = 'true';
  delete process.env.DIAGNOSTIC_READONLY_DATABASE_URL;
  await assert.rejects(inspectTableColumns(['widgets']), /dedicated diagnostic read-only connection/);
});

test('BEGIN READ ONLY failure rolls back and always ends the client', async () => {
  configureValidEnvironment();
  const { inspectTableColumns } = await loadInspection();
  const original = MockClient.prototype;

  const instanceIndex = MockClient.instances.length;
  const promise = inspectTableColumns(['widgets']);
  await Promise.resolve();

  const client = MockClient.instances[instanceIndex];
  client.fail['BEGIN READ ONLY'] = new Error('read-only unavailable');
  await assert.rejects(promise, /read-only unavailable/);

  const beginIndex = client.calls.findIndex((call) => call[1] === 'BEGIN READ ONLY');
  assert.equal(beginIndex, -1, 'the mock must be rejected before a BEGIN call completes');
  assert.ok(client.calls.some((call) => call[0] === 'end'));
  assert.ok(!client.calls.some((call) => typeof call[1] === 'string' && call[1].includes('FROM information_schema.columns')));
  void original;
});

test('missing or failed read-only verification rolls back and never returns metadata', async (t) => {
  configureValidEnvironment();
  const { inspectTableColumns } = await loadInspection();

  for (const [name, row] of [
    ['missing verification row', null],
    ['transaction not read-only', validSafetyRow({ transaction_read_only: 'off' })],
    ['superuser role', validSafetyRow({ rolsuper: true })],
    ['write privilege', validSafetyRow({ has_write_privilege: true })],
  ]) {
    await t.test(name, async () => {
      const index = MockClient.instances.length;
      const pending = inspectTableColumns(['widgets']);
      await Promise.resolve();
      const client = MockClient.instances[index];
      client.rows = row;
      client.metadataRows = [{ table_name: 'widgets', column_name: 'secret_row_data' }];

      await assert.rejects(pending, /failed read-only verification/);
      assert.ok(client.calls.some((call) => call[1] === 'ROLLBACK'));
      assert.ok(client.calls.some((call) => call[0] === 'end'));
      assert.ok(!client.calls.some((call) => typeof call[1] === 'string' && call[1].includes('FROM information_schema.columns')));
    });
  }
});

test('verified BEGIN READ ONLY returns metadata and commits', async () => {
  configureValidEnvironment();
  const { inspectTableColumns } = await loadInspection();

  const index = MockClient.instances.length;
  const pending = inspectTableColumns(['widgets']);
  await Promise.resolve();
  const client = MockClient.instances[index];
  client.rows = validSafetyRow();
  client.metadataRows = [{ table_name: 'widgets', column_name: 'id', data_type: 'uuid', udt_name: 'uuid', is_nullable: 'NO' }];

  const rows = await pending;
  assert.equal(rows.length, 1);
  assert.ok(client.calls.some((call) => call[1] === 'BEGIN READ ONLY'));
  assert.ok(client.calls.some((call) => call[1] === 'COMMIT'));
  assert.ok(client.calls.some((call) => call[0] === 'end'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const simApiDir = path.resolve(testDir, '..');
const diagnosticTokenForTest = 'test-only-diagnostic-token';

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHealth(url, child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`diagnostic server exited: ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('diagnostic server did not become healthy');
}

async function startDiagnosticServer(extraEnv = {}) {
  const port = await availablePort();
  const cleanEnv = { ...process.env, PORT: String(port), ...extraEnv };
  delete cleanEnv.DIAGNOSTIC_DB_ENABLED;
  delete cleanEnv.DIAGNOSTIC_READONLY_DATABASE_URL;
  delete cleanEnv.DATABASE_URL;
  const child = spawn(process.execPath, ['src/diagnostic-server.js'], {
    cwd: simApiDir,
    env: cleanEnv,
    stdio: 'ignore',
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForHealth(`${baseUrl}/api/health`, child);
  } catch (error) {
    child.kill('SIGTERM');
    throw error;
  }
  return { child, baseUrl };
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', resolve));
}

test('GET /api/health works without DB config or diagnostic token', async () => {
  const { child, baseUrl } = await startDiagnosticServer();
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
  } finally {
    await stopChild(child);
  }
});

test('only health and authenticated schema GET are available; other paths/methods return 404', async () => {
  const { child, baseUrl } = await startDiagnosticServer({ DIAGNOSTIC_TOKEN: diagnosticTokenForTest });
  try {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);

    const missingAuth = await fetch(`${baseUrl}/api/diagnostics/schema`);
    assert.equal(missingAuth.status, 401);

    const authorized = await fetch(`${baseUrl}/api/diagnostics/schema`, {
      headers: { authorization: `Bearer ${diagnosticTokenForTest}` },
    });
    // Correct bearer auth reaches the schema handler; absent DB config fails closed.
    assert.equal(authorized.status, 503);

    for (const [method, route] of [
      ['GET', '/api/rounds'],
      ['GET', '/api/transfer'],
      ['GET', '/api/settlement'],
      ['GET', '/api/diagnostics/rounds'],
      ['POST', '/api/health'],
      ['POST', '/api/diagnostics/schema'],
      ['PUT', '/api/diagnostics/schema'],
      ['DELETE', '/api/health'],
      ['HEAD', '/api/health'],
      ['HEAD', '/api/diagnostics/schema'],
    ]) {
      const response = await fetch(`${baseUrl}${route}`, { method });
      assert.equal(response.status, 404, `${method} ${route} should not be exposed`);
    }
  } finally {
    await stopChild(child);
  }
});

test('diagnostic dependency sources contain no operational or Supabase admin imports', async () => {
  const files = [
    'src/diagnostic-server.js',
    'src/diagnostics/schema-report.js',
    'src/db/schemaInspection.js',
    'src/db/schemaMapping.js',
  ];
  const forbiddenPatterns = [
    /(?:from\s*|import\s*\()['"](?:[^'"\n]*\/)?routes\//,
    /(?:from\s*|import\s*\()['"][^'"\n]*(?:roundEngine|supabaseAdmin|transfer|settlement)[^'"\n]*['"]/i,
    /public\.transfer_virtual_coins/i,
  ];

  for (const file of files) {
    const source = await readFile(path.join(simApiDir, file), 'utf8');
    for (const pattern of forbiddenPatterns) assert.doesNotMatch(source, pattern, `${file} must remain isolated`);
  }
});

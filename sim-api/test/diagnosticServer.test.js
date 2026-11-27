import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const simApiDir = path.resolve(testDir, '..');

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
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`diagnostic server exited: ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('diagnostic server did not become healthy');
}

test('GET /api/health works without database or diagnostic DB config', async () => {
  const port = await availablePort();
  const cleanEnv = { ...process.env, PORT: String(port) };
  delete cleanEnv.DIAGNOSTIC_DB_ENABLED;
  delete cleanEnv.DIAGNOSTIC_READONLY_DATABASE_URL;
  delete cleanEnv.DIAGNOSTIC_TOKEN;
  delete cleanEnv.DATABASE_URL;

  const child = spawn(process.execPath, ['src/diagnostic-server.js'], {
    cwd: simApiDir,
    env: cleanEnv,
    stdio: 'ignore',
  });

  try {
    const health = await waitForHealth(`http://127.0.0.1:${port}/api/health`, child);
    assert.equal(health.status, 200);
    const body = await health.json();
    assert.equal(body.status, 'ok');

    const missingRoute = await fetch(`http://127.0.0.1:${port}/api/diagnostics/rounds`);
    assert.equal(missingRoute.status, 404);

    const schemaWithoutToken = await fetch(`http://127.0.0.1:${port}/api/diagnostics/schema`);
    assert.equal(schemaWithoutToken.status, 503);
  } finally {
    child.kill('SIGTERM');
  }
});

test('diagnostic server source does not import operational or Supabase admin modules', async () => {
  const source = await readFile(path.join(simApiDir, 'src', 'diagnostic-server.js'), 'utf8');
  const forbiddenPatterns = [
    /\.\/routes\//,
    /src\/routes\//,
    /rounds\.js/,
    /roundEngine/,
    /supabaseAdmin/,
    /transfer_virtual_coins/,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern);
  }
});

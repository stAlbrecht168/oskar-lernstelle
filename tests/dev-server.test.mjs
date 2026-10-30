import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {PUBLIC_FILES, startDevServer} from '../scripts/dev-server.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'oskar-server-synthetic-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  for (const name of PUBLIC_FILES) await writeFile(join(root, name), 'synthetic public ' + name);
  for (const name of ['local-data/materialien.json', 'Originaldateien/test.txt', '.git/config', '.env', '.dev.vars', 'worker/.dev.vars', 'worker/index.js', 'docs/internal.md', 'README.md', 'AGENTS.md', '.vscode/settings.json', 'tests/internal.mjs']) {
    const parts = name.split('/');
    if (parts.length > 1) await mkdir(join(root, ...parts.slice(0, -1)), {recursive:true});
    await writeFile(join(root, name), 'synthetic private sentinel');
  }
  const server = await startDevServer({root, port:0});
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return {root, server};
}

function get(server, path, {method = 'GET', host} = {}) {
  return new Promise((resolve, reject) => {
    const req = request({host:'127.0.0.1', port:server.address().port, path, method,
      headers:host ? {host} : {}}, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {body += chunk;});
      res.on('end', () => resolve({status:res.statusCode, headers:res.headers, body}));
    });
    req.on('error', reject);
    req.end();
  });
}

test('serves the entry point and every app script only on IPv4 loopback', async t => {
  const {server} = await fixture(t);
  assert.equal(server.address().address, '127.0.0.1');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  assert.ok(scripts.length > 0);
  for (const name of ['index.html', ...scripts]) {
    const result = await get(server, '/' + name);
    assert.equal(result.status, 200, name);
    assert.equal(result.body, 'synthetic public ' + name);
    assert.equal(result.headers['x-content-type-options'], 'nosniff');
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.match(result.headers['content-type'], name.endsWith('.html') ? /^text\/html/ : /^text\/javascript/);
  }
  assert.equal((await get(server, '/')).body, 'synthetic public index.html');
  assert.equal((await get(server, '/index.html?cache=synthetic')).status, 200);
});

test('HEAD returns public headers without a response body', async t => {
  const {server} = await fixture(t);
  const result = await get(server, '/index.html', {method:'HEAD'});
  assert.equal(result.status, 200);
  assert.equal(result.body, '');
  assert.equal(Number(result.headers['content-length']), Buffer.byteLength('synthetic public index.html'));
});

test('private directories, secrets and internal files are never served', async t => {
  const {server} = await fixture(t);
  for (const path of ['/local-data/', '/local-data/materialien.json', '/Originaldateien/test.txt', '/.git/', '/.git/config', '/.env', '/.env.local', '/.dev.vars', '/worker/.dev.vars', '/worker/index.js', '/docs/internal.md', '/README.md', '/AGENTS.md', '/.vscode/settings.json', '/tests/internal.mjs', '/scripts/dev-server.mjs', '/favicon.ico']) {
    const result = await get(server, path);
    assert.equal(result.status, 404, path);
    assert.equal(result.body, 'Nicht gefunden.', path);
  }
  const head = await get(server, '/local-data/materialien.json', {method:'HEAD'});
  assert.equal(head.status, 404);
  assert.equal(head.body, '');
});

test('raw traversal, encoded paths and alternate URL forms are rejected', async t => {
  const {server} = await fixture(t);
  for (const path of ['/../index.html', '/x/../index.html', '/%2e%2e/index.html', '/%2E%2E/.env', '/%252e%252e/.env', '/%2findex.html', '/%69ndex.html', '//index.html', '/index.html/', '/index.html%00', '/index.html/.env', '/index.html%2f..%2f.env', '/..\\.env', '/%', 'http://127.0.0.1/index.html']) {
    const result = await get(server, path);
    assert.equal(result.status, 404, path);
    assert.equal(result.body, 'Nicht gefunden.', path);
  }
});

test('an allowlisted filename cannot expose a symlink target or a directory', async t => {
  const {root, server} = await fixture(t);
  await rm(join(root, 'index.html'));
  await symlink(join(root, 'local-data/materialien.json'), join(root, 'index.html'));
  assert.equal((await get(server, '/')).status, 404);
  assert.equal((await get(server, '/index.html')).body, 'Nicht gefunden.');
  await rm(join(root, 'study-v04.js'));
  await mkdir(join(root, 'study-v04.js'));
  assert.equal((await get(server, '/study-v04.js')).status, 404);
});

test('rejects writes and requests addressed to other hosts', async t => {
  const {server} = await fixture(t);
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const result = await get(server, '/index.html', {method});
    assert.equal(result.status, 405, method);
    assert.equal(result.headers.allow, 'GET, HEAD');
  }
  assert.equal((await get(server, '/index.html', {host:'synthetic.invalid'})).status, 403);
});

test('missing public files return a generic 404 without filesystem paths', async t => {
  const {root, server} = await fixture(t);
  await rm(join(root, 'study-v04.js'));
  const result = await get(server, '/study-v04.js');
  assert.equal(result.status, 404);
  assert.equal(result.body, 'Nicht gefunden.');
});

test('the CLI rejects invalid ports and cannot accept a host override', async () => {
  const run = promisify(execFile);
  const script = fileURLToPath(new URL('../scripts/dev-server.mjs', import.meta.url));
  for (const args of [['65536'], ['-1'], ['8000', '0.0.0.0']]) {
    await assert.rejects(run(process.execPath, [script, ...args]), error => error.code === 1);
  }
});

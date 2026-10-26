import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const app = resolve(root, 'apps/app');
const projectId = '12345678-1234-1234-1234-123456789abc';
function config(overrides = {}) {
  const env = { ...process.env, EXPO_NO_DOTENV: '1' };
  for (const key of ['EAS_PROJECT_ID', 'SPARQFIRE_RELEASE', 'EXPO_PUBLIC_API_URL']) delete env[key];
  return spawnSync(process.execPath, ['-e',
    "console.log(JSON.stringify(require('expo/config').getConfig(process.cwd()).exp))",
  ], { cwd: app, env: { ...env, ...overrides }, encoding: 'utf8' });
}
test('unlinked local development works without enabling an invalid OTA endpoint', () => {
  const result = config();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).updates.enabled, false);
});
test('releases require a real project link', () => {
  const result = config({ SPARQFIRE_RELEASE: '1' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Link your Expo project/);
});
test('invalid project identifiers are rejected', () => {
  const result = config({ EAS_PROJECT_ID: 'replace-me' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /UUID/);
});
test('release bundles reject missing, local, insecure, and non-origin API URLs', () => {
  for (const url of ['', 'http://api.example.com', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://api.example.com/api', 'https://user:pass@api.example.com', 'https://api.example.com?token=secret']) {
    const result = config({ EAS_PROJECT_ID: projectId, SPARQFIRE_RELEASE: '1', EXPO_PUBLIC_API_URL: url });
    assert.notEqual(result.status, 0, `Allowed invalid release origin: ${url}`);
  }
});
test('linked releases enable next-launch OTA updates with native compatibility checks', () => {
  const result = config({ EAS_PROJECT_ID: projectId, SPARQFIRE_RELEASE: '1', EXPO_PUBLIC_API_URL: 'https://api.example.com' });
  assert.equal(result.status, 0, result.stderr);
  const appConfig = JSON.parse(result.stdout);
  assert.equal(appConfig.updates.url, `https://u.expo.dev/${projectId}`);
  assert.equal(appConfig.extra.eas.projectId, projectId);
  assert.equal(appConfig.updates.enabled, true);
  assert.equal(appConfig.updates.checkAutomatically, 'ON_LOAD');
  assert.equal(appConfig.updates.fallbackToCacheTimeout, 0);
  assert.equal(appConfig.runtimeVersion.policy, 'fingerprint');
});
test('standalone builds keep preview and production update channels separate', () => {
  const { build } = JSON.parse(readFileSync(resolve(app, 'eas.json'), 'utf8'));
  for (const profile of ['preview', 'production']) {
    assert.equal(build[profile].channel, profile);
    assert.equal(build[profile].environment, profile);
    assert.equal(build[profile].ios.buildConfiguration, 'Release');
    assert.equal(build[profile].ios.simulator, false);
    assert.equal(build[profile].extends, 'base');
  }
  assert.equal(build.base.env.SPARQFIRE_RELEASE, '1');
  assert.equal(build.production.distribution, 'store');
  assert.equal(build.preview.distribution, 'internal');
  assert.equal(build.simulator.ios.simulator, true);
});

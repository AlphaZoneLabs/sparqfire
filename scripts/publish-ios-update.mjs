import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/app');
const require = createRequire(resolve(appRoot, 'package.json'));
const environment = process.argv[2];
if (!['preview', 'production'].includes(environment)) {
  throw new Error('Select preview or production for the iOS update.');
}
// Called inside eas env:exec so the guard sees the same environment as bundling.
process.env.SPARQFIRE_RELEASE = '1';
process.env.EXPO_NO_DOTENV = '1';
const { getConfig } = require('expo/config');
getConfig(appRoot);

const easPackage = require.resolve('eas-cli/package.json');
const { bin } = JSON.parse(readFileSync(easPackage, 'utf8'));
const result = spawnSync(process.execPath, [
  resolve(dirname(easPackage), bin.eas), 'update',
  '--platform', 'ios', '--channel', environment, '--environment', environment,
  ...process.argv.slice(3),
], { cwd: appRoot, env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);

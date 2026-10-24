import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {normalizeEmail,validateDomain,boundedText,strongPassword} from '../src/validation.mjs';
test('normalizes emails and refuses invalid values',()=>{assert.equal(normalizeEmail('  Admin@Example.com '),'admin@example.com');assert.equal(normalizeEmail('invalid'),null);assert.equal(normalizeEmail('foo@@example.com'),null)});
test('accepts valid sending domains and rejects unsafe hostnames',()=>{assert.equal(validateDomain('News.Example.COM'),'news.example.com');assert.equal(validateDomain('bad..example.com'),null);assert.equal(validateDomain('https://example.com'),null);assert.equal(validateDomain('one_label'),null)});
test('enforces password length and input bounds',()=>{assert.equal(strongPassword('long-secret-password-2026'),true);assert.equal(strongPassword('short'),false);assert.equal(boundedText(' abc ',2),'ab')});

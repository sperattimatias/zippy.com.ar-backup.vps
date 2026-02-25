#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const composePath = 'infra/docker-compose.yml';
const envExamplePath = '.env.example';

function parseComposeVars(raw) {
  return new Set([...raw.matchAll(/\$\{([A-Z0-9_]+)\}/g)].map((m) => m[1]));
}

function parseEnvVars(raw) {
  const vars = new Map();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    vars.set(key, rest.join('='));
  }
  return vars;
}

function fail(message, details = []) {
  console.error(`❌ ${message}`);
  for (const d of details) console.error(`  - ${d}`);
  process.exitCode = 1;
}

const composeRaw = readFileSync(composePath, 'utf8');
const envRaw = readFileSync(envExamplePath, 'utf8');

const composeVars = parseComposeVars(composeRaw);
const envVars = parseEnvVars(envRaw);

const missing = [...composeVars].filter((k) => !envVars.has(k)).sort();
const extra = [...envVars.keys()].filter((k) => !composeVars.has(k)).sort();

if (missing.length) {
  fail('.env.example is missing variables required by docker-compose', missing);
}

if (extra.length) {
  fail('.env.example contains variables not used by docker-compose', extra);
}

const secretPlaceholders = {
  CF_DNS_API_TOKEN: ['replace-me', ''],
  JWT_ACCESS_SECRET: ['change-me', 'replace-me', 'change-me-please-use-at-least-32-chars', ''],
};

for (const [key, allowedValues] of Object.entries(secretPlaceholders)) {
  const value = envVars.get(key);
  if (value === undefined) {
    fail(`Required key ${key} is missing from .env.example`);
    continue;
  }
  if (!allowedValues.includes(value)) {
    fail(`Expected ${key} to remain a placeholder in .env.example`, [
      `Found value: ${value}`,
      `Allowed placeholders: ${allowedValues.join(', ')}`,
    ]);
  }
}


const jwtSecret = envVars.get('JWT_ACCESS_SECRET') || '';
if (jwtSecret && jwtSecret.length < 32) {
  fail('JWT_ACCESS_SECRET in .env.example must be at least 32 chars to satisfy auth config validation', [
    `Current length: ${jwtSecret.length}`,
  ]);
}

if (process.exitCode !== 1) {
  console.log('✅ Configuration validation passed');
  console.log(`   - compose vars: ${composeVars.size}`);
  console.log(`   - env vars: ${envVars.size}`);
}

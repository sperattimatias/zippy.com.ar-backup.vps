#!/usr/bin/env node
/**
 * Validates production/deploy environment variables from process.env.
 * Intended to run in CI/CD deployment jobs.
 */

const required = [
  'TRAEFIK_DOMAIN',
  'ACME_EMAIL',
  'CF_DNS_API_TOKEN',
  'NODE_ENV',
  'LOG_LEVEL',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'REFRESH_TOKEN_EXPIRES_DAYS',
  'EMAIL_VERIFICATION_TTL_MIN',
  'MINIO_ENDPOINT',
  'MINIO_PORT',
  'MINIO_ROOT_USER',
  'MINIO_ROOT_PASSWORD',
  'MINIO_BUCKET',
];

const disallowedPlaceholders = new Map([
  ['CF_DNS_API_TOKEN', ['replace-me', 'changeme', 'change-me', 'token', '']],
  ['JWT_ACCESS_SECRET', ['replace-me', 'changeme', 'change-me', 'secret', '']],
  ['POSTGRES_PASSWORD', ['postgres', 'password', 'changeme', 'change-me', '']],
  ['MINIO_ROOT_PASSWORD', ['minio123', 'password', 'changeme', 'change-me', '']],
]);

let hasErrors = false;

for (const key of required) {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Missing required production env: ${key}`);
    hasErrors = true;
  }
}

for (const [key, placeholders] of disallowedPlaceholders.entries()) {
  const value = (process.env[key] || '').trim();
  if (!value) continue;
  if (placeholders.includes(value.toLowerCase())) {
    console.error(`❌ ${key} cannot use placeholder/default value in production`);
    hasErrors = true;
  }
}

if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
  console.error('❌ NODE_ENV must be production for deployment');
  hasErrors = true;
}

if (hasErrors) {
  process.exit(1);
}

console.log('✅ Production environment validation passed');

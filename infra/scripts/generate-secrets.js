#!/usr/bin/env node
// Genera los secretos necesarios para infra/.env: contraseñas aleatorias,
// JWT_SECRET, y los JWT (HS256) de ANON_KEY/SERVICE_ROLE_KEY firmados con ese
// secreto. No depende de librerías externas, solo del módulo `crypto` de Node.
//
// Uso:
//   node scripts/generate-secrets.js            imprime los valores
//   node scripts/generate-secrets.js --write     los escribe directo en .env
//     (copiando .env.example si .env no existe todavía)

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signHS256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${headerB64}.${payloadB64}.${signature}`;
}

const now = Math.floor(Date.now() / 1000);
const tenYears = 10 * 365 * 24 * 60 * 60;

const jwtSecret = crypto.randomBytes(32).toString('base64url');
const postgresPassword = crypto.randomBytes(24).toString('hex');
const dashboardPassword = crypto.randomBytes(12).toString('hex');
const pgMetaCryptoKey = crypto.randomBytes(24).toString('base64');

const anonKey = signHS256({ role: 'anon', iss: 'gym-supabase', iat: now, exp: now + tenYears }, jwtSecret);
const serviceRoleKey = signHS256(
  { role: 'service_role', iss: 'gym-supabase', iat: now, exp: now + tenYears },
  jwtSecret
);

const values = {
  POSTGRES_PASSWORD: postgresPassword,
  JWT_SECRET: jwtSecret,
  ANON_KEY: anonKey,
  SERVICE_ROLE_KEY: serviceRoleKey,
  DASHBOARD_PASSWORD: dashboardPassword,
  PG_META_CRYPTO_KEY: pgMetaCryptoKey,
};

if (process.argv.includes('--write')) {
  const envPath = path.join(__dirname, '..', '.env');
  const examplePath = path.join(__dirname, '..', '.env.example');
  let content = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf8')
    : fs.readFileSync(examplePath, 'utf8');

  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    content = regex.test(content) ? content.replace(regex, line) : `${content}\n${line}`;
  }

  fs.writeFileSync(envPath, content);
  console.log(`Secretos escritos en ${envPath}`);
} else {
  console.log('Copia estos valores a tu infra/.env:\n');
  for (const [key, value] of Object.entries(values)) {
    console.log(`${key}=${value}`);
  }
  console.log('\nTip: corre con --write para que se escriban directo en infra/.env');
}

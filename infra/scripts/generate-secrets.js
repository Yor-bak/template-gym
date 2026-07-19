#!/usr/bin/env node
// Genera los secretos necesarios para infra/.env: POSTGRES_PASSWORD,
// JWT_SECRET y QR_SECRET. No depende de librerías externas, solo del
// módulo `crypto` de Node.
//
// Uso:
//   node scripts/generate-secrets.js            imprime los valores
//   node scripts/generate-secrets.js --write     los escribe directo en .env
//     (copiando .env.example si .env no existe todavía)

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const values = {
  POSTGRES_PASSWORD: crypto.randomBytes(24).toString('hex'),
  JWT_SECRET: crypto.randomBytes(32).toString('base64url'),
  // Secreto separado del JWT a propósito (ver infra/.env.example) — firma el
  // QR de acceso rotativo, se puede rotar sin invalidar sesiones activas.
  QR_SECRET: crypto.randomBytes(32).toString('base64url'),
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

/**
 * Aplica schema.sql + schema-social.sql no Supabase (PostgreSQL).
 * Uso: node scripts/apply-all-schemas.mjs "SENHA_DO_BANCO"
 * Ou:  $env:SUPABASE_DB_PASSWORD="..." ; node scripts/apply-all-schemas.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const password = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('Uso: node scripts/apply-all-schemas.mjs "senha_do_banco"');
  console.error('Ou defina SUPABASE_DB_PASSWORD no ambiente.');
  process.exit(1);
}

const ref = 'blcomwofpyorypqjdhfb';
const regions = [
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
];

const __dir = dirname(fileURLToPath(import.meta.url));
const files = ['schema.sql', 'schema-social.sql'].map(f =>
  readFileSync(join(__dir, '..', 'supabase', f), 'utf8')
);
const sqlText = files.join('\n\n');

let applied = false;
for (const url of regions) {
  const sql = postgres(url, { ssl: 'require', max: 1 });
  try {
    await sql.unsafe(sqlText);
    console.log('OK — schemas aplicados:', files.join(', '));
    applied = true;
    await sql.end();
    break;
  } catch (e) {
    await sql.end().catch(() => {});
    if (url === regions[regions.length - 1]) {
      console.error('ERRO:', e.message);
      process.exit(1);
    }
  }
}
if (!applied) process.exit(1);
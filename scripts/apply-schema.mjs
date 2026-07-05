/**
 * Aplica schema.sql no Supabase via conexão PostgreSQL.
 * Uso: node scripts/apply-schema.mjs "SUA_SENHA_DO_BANCO"
 * Senha: Supabase Dashboard → Settings → Database → Database password
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/apply-schema.mjs "senha_do_banco"');
  process.exit(1);
}

const ref = 'blcomwofpyorypqjdhfb';
const url = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const __dir = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dir, '..', 'supabase', 'schema.sql'), 'utf8');

const sql = postgres(url, { ssl: 'require', max: 1 });

try {
  await sql.unsafe(schema);
  console.log('OK — schema aplicado com sucesso!');
} catch (e) {
  const url2 = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;
  const sql2 = postgres(url2, { ssl: 'require', max: 1 });
  try {
    await sql2.unsafe(schema);
    console.log('OK — schema aplicado (sa-east-1)!');
  } catch (e2) {
    console.error('ERRO:', e2.message);
    process.exit(1);
  } finally {
    await sql2.end();
  }
} finally {
  try { await sql.end(); } catch {}
}
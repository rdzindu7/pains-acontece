import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const password = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;
if (!password) { console.error('Passe a senha'); process.exit(1); }

const ref = 'blcomwofpyorypqjdhfb';
const url = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-1-us-west-1.pooler.supabase.com:6543/postgres`;
const __dir = dirname(fileURLToPath(import.meta.url));
const social = readFileSync(join(__dir, '..', 'supabase', 'schema-social.sql'), 'utf8');

const sql = postgres(url, { ssl: 'require', max: 1, connect_timeout: 30 });
try {
  await sql.unsafe(social);
  console.log('OK — schema-social.sql aplicado (perfis, selo, RPC admin_set_verified)');
} catch (e) {
  console.error('ERRO:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
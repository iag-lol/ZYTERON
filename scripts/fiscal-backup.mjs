import { createCipheriv, createDecipheriv, createHash, createPrivateKey, privateDecrypt, publicEncrypt, randomBytes, sign, verify, X509Certificate } from 'node:crypto';
import { readFile, mkdir, writeFile, open } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const bucket = 'fiscal-backups';
const company = '78398774-0';
const sourceBuckets = ['finance-documents', 'finance-secrets', 'quote-invoices', 'accounting-documents', 'expense-documents'];
const fiscalTables = ['finance_settings', 'tax_document_types', 'dte_certificates', 'tax_folio_authorizations', 'tax_folios', 'tax_documents', 'tax_document_transmissions', 'tax_document_events', 'received_tax_documents', 'sii_certification_runs', 'sii_certification_cases', 'sii_certification_artifacts', 'sii_certification_submissions', 'invoices', 'invoice_lines', 'payments', 'payment_allocations', 'quote_payment_plans', 'quote_payment_installments', 'billing_schedules', 'billing_schedule_runs', 'rcv_imports', 'rcv_entries', 'finance_audit_events'];
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const identifier = value => '"' + value.replaceAll('"', '""') + '"';
const json = value => Buffer.from(JSON.stringify(value));
async function inPairs(items, callback) {
  for (let i = 0; i < items.length; i += 2) {
    const results = await Promise.allSettled(items.slice(i, i + 2).map(callback));
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
}
function certificate(env) {
  const ref = env.DTE_CERTIFICATE_SECRET_REF || 'DTE_CERTIFICATE_PEM';
  const pem = env[ref] || '';
  const crt = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)?.[0];
  const keyPem = pem.match(/-----BEGIN (?:RSA |ENCRYPTED )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |ENCRYPTED )?PRIVATE KEY-----/)?.[0];
  if (!crt || !keyPem) throw Error('FISCAL_BACKUP_CERTIFICATE_REQUIRED');
  const cert = new X509Certificate(crt), key = createPrivateKey({ key: keyPem, passphrase: env[ref + '_PASSPHRASE'] });
  if (!cert.checkPrivateKey(key)) throw Error('FISCAL_BACKUP_CERTIFICATE_MISMATCH');
  return { cert, key, pem: crt, fingerprint: cert.fingerprint256.replaceAll(':', '').toLowerCase() };
}
function archiveKey(env) {
  const raw = env.FINANCE_ENCRYPTION_KEY || '';
  const key = /^[a-f\d]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw Error('FISCAL_BACKUP_ENCRYPTION_REQUIRED');
  return key;
}
export function seal(bytes, key, aad) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(gzipSync(bytes)), cipher.final()]);
  return Buffer.concat([Buffer.from('ZYFB1'), iv, cipher.getAuthTag(), ciphertext]);
}
export function unseal(bytes, key, aad) {
  if (bytes.subarray(0, 5).toString() !== 'ZYFB1') throw Error('FISCAL_BACKUP_FORMAT');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(5, 17));
  decipher.setAAD(Buffer.from(aad)); decipher.setAuthTag(bytes.subarray(17, 33));
  return gunzipSync(Buffer.concat([decipher.update(bytes.subarray(33)), decipher.final()]), { maxOutputLength: 128 * 1024 * 1024 });
}
export function safeDestination(root, relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || relative.startsWith('/') || relative.split('/').some(p => !p || p === '.' || p === '..')) throw Error('FISCAL_BACKUP_PATH');
  const base = resolve(root), target = resolve(base, relative);
  if (!target.startsWith(base + sep)) throw Error('FISCAL_BACKUP_PATH');
  return target;
}
async function database(env) {
  const target = new URL(env.DATABASE_URL);
  if (!/\.supabase\.(co|com)$/.test(target.hostname)) throw Error('FISCAL_BACKUP_DATABASE_HOST');
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) target.searchParams.delete(key);
  const db = new pg.Client({ connectionString: target.href, connectionTimeoutMillis: 15000, ssl: { rejectUnauthorized: true, ca: env.DATABASE_SSL_CA || await readFile(new URL('../src/lib/database/supabase-ca.crt', import.meta.url), 'utf8') } });
  db.on('error', () => {});
  try { await db.connect(); return db; } catch (error) { await db.end().catch(() => {}); throw error; }
}
function storage(env) {
  const url = new URL(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL);
  if (url.origin !== 'https://bwybwrxrbzjkwpxhpkcr.supabase.co') throw Error('FISCAL_BACKUP_PROJECT');
  return createClient(url.origin, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init = {}) => fetch(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) }) } }).storage;
}
async function download(store, bucketId, path) {
  const { data, error } = await store.from(bucketId).download(path);
  if (error || !data) throw Error('FISCAL_BACKUP_DOWNLOAD_FAILED');
  return Buffer.from(await data.arrayBuffer());
}
async function putImmutable(store, path, bytes) {
  const { error } = await store.from(bucket).upload(path, bytes, { contentType: 'application/octet-stream', upsert: false });
  if (error && !['409', '400'].includes(String(error.statusCode))) throw Error('FISCAL_BACKUP_UPLOAD_FAILED');
  const saved = await download(store, bucket, path);
  if (!saved.equals(bytes)) throw Error('FISCAL_BACKUP_READBACK_MISMATCH');
}
export async function createFiscalBackup({ env = process.env, force = false, localDir } = {}) {
  const store = storage(env), signer = certificate(env), key = archiveKey(env), db = await database(env);
  const keyId = digest(key).slice(0, 24), prefix = `${company}/${keyId}`;
  const id = new Date().toISOString().replaceAll(':', '-'), day = id.slice(0, 10);
  let locked = false;
  try {
    locked = (await db.query("select pg_try_advisory_lock(hashtext('zyteron:fiscal-backup')) as locked")).rows[0].locked;
    if (!locked) return { state: 'BUSY' };
    const { data: existingBucket, error: bucketError } = await store.getBucket(bucket);
    if (bucketError || !existingBucket || existingBucket.public) throw Error('FISCAL_BACKUP_PRIVATE_BUCKET_REQUIRED');
    const { data: manifests, error: listError } = await store.from(bucket).list(`${prefix}/manifests`, { limit: 100, sortBy: { column: 'name', order: 'desc' } });
    if (listError) throw Error('FISCAL_BACKUP_LIST_FAILED');
    if (!force && manifests.some(m => m.name.startsWith(day))) {
      const prior = await db.query("select 1 from public.finance_audit_events where action='FISCAL_BACKUP_VERIFIED' and occurred_at >= $1::date limit 1", [day]);
      if (prior.rowCount) return { state: 'CURRENT', day };
    }
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await db.query("SET LOCAL statement_timeout='60s'");
    const settings = (await db.query('select company_rut,dte_environment from public.finance_settings')).rows[0];
    if (settings?.company_rut !== company) throw Error('FISCAL_BACKUP_COMPANY');
    const manifest = { version: 1, companyRut: company, environment: settings.dte_environment, createdAt: new Date().toISOString(), retainUntil: new Date(Date.now() + 7 * 366 * 86400000).toISOString(), scope: 'FISCAL_RECORDS_AND_FILES', entries: [], tables: [], objects: [], encryptionKeyEscrow: env.FINANCE_ENCRYPTION_KEY };
    const knownObjects = new Set();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await store.from(bucket).list(`${prefix}/objects`, { limit: 1000, offset });
      if (error) throw Error('FISCAL_BACKUP_LIST_FAILED');
      for (const item of data) knownObjects.add(item.name);
      if (data.length < 1000) break;
    }
    const pendingBlobs = new Map();
    async function archive(bytes, relative) {
      safeDestination('/fiscal-archive', relative);
      const sha256 = digest(bytes), aad = `ZYTERON:FISCAL:1:${company}:${sha256}`, path = `${prefix}/objects/${sha256}.enc`;
      if (!pendingBlobs.has(sha256)) pendingBlobs.set(sha256, (async () => {
        if (knownObjects.has(sha256 + '.enc')) {
          if (!unseal(await download(store, bucket, path), key, aad).equals(bytes)) throw Error('FISCAL_BACKUP_EXISTING_MISMATCH');
        } else { await putImmutable(store, path, seal(bytes, key, aad)); knownObjects.add(sha256 + '.enc'); }
      })());
      await pendingBlobs.get(sha256);
      manifest.entries.push({ relative, path, sha256, size: bytes.length, aad });
    }
    const tables = (await db.query(`with recursive dependencies(oid) as (
      select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1) and c.relkind='r'
      union select con.confrelid from pg_constraint con join dependencies d on d.oid=con.conrelid join pg_class c on c.oid=con.confrelid join pg_namespace n on n.oid=c.relnamespace where con.contype='f' and n.nspname='public'
    ) select c.relname from dependencies d join pg_class c on c.oid=d.oid order by c.relname`, [fiscalTables])).rows.map(r => r.relname);
    for (const required of ['finance_settings', 'tax_documents', 'tax_folios', 'tax_folio_authorizations', 'invoices']) if (!tables.includes(required)) throw Error('FISCAL_BACKUP_SCHEMA_INCOMPLETE');
    for (const table of tables) {
      const result = await db.query(`select to_jsonb(t)::text as body from public.${identifier(table)} t order by to_jsonb(t)::text`);
      const bytes = Buffer.from('[' + result.rows.map(r => r.body).join(',') + ']');
      await archive(bytes, `tables/${table}.json`); manifest.tables.push({ table, rows: result.rowCount });
    }
    const schema = (await db.query(`select table_name,column_name,data_type,udt_name,is_nullable,column_default,is_generated,generation_expression from information_schema.columns where table_schema='public' and table_name=any($1) order by table_name,ordinal_position`, [tables])).rows;
    await archive(json(schema), 'metadata/columns.json');
    const constraints = (await db.query(`select c.relname as table_name,con.conname,con.contype,pg_get_constraintdef(con.oid) as definition from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1) order by c.relname,con.conname`, [tables])).rows;
    await archive(json(constraints), 'metadata/constraints.json');
    const objects = (await db.query('select bucket_id,name,metadata from storage.objects where bucket_id=any($1) order by bucket_id,name', [sourceBuckets])).rows;
    await db.query('COMMIT');
    await inPairs(objects, async object => {
      const bytes = await download(store, object.bucket_id, object.name);
      await archive(bytes, `files/${object.bucket_id}/${object.name}`); manifest.objects.push({ bucket: object.bucket_id, name: object.name, sha256: digest(bytes), size: bytes.length, metadata: object.metadata });
    });
    const payload = seal(json(manifest), key, `ZYTERON:FISCAL:MANIFEST:${id}`);
    const header = { version: 1, id, companyRut: company, keyId, signerFingerprint: signer.fingerprint, certificate: signer.pem, wrappedKey: publicEncrypt({ key: signer.cert.publicKey, oaepHash: 'sha256' }, key).toString('base64'), payload: payload.toString('base64') };
    const signedBytes = json(header), envelope = json({ ...header, signature: sign('sha256', signedBytes, signer.key).toString('base64') });
    const path = `${prefix}/manifests/${id}.json.enc`;
    await putImmutable(store, path, envelope);
    const summary = { state: 'VERIFIED', manifestPath: path, manifestSha256: digest(envelope), tables: manifest.tables.length, rows: manifest.tables.reduce((n, t) => n + t.rows, 0), files: objects.length, retainUntil: manifest.retainUntil };
    await db.query(`insert into public.finance_audit_events(actor_id,actor_role,action,entity_type,entity_id,summary,metadata,occurred_at)
      values(null,null,'FISCAL_BACKUP_VERIFIED','FISCAL_ARCHIVE',null,'Respaldo fiscal cifrado y recuperado para verificación',$1::jsonb,now())`, [JSON.stringify(summary)]);
    if (localDir) await exportFiscalBackup({ env, manifestPath: path, destination: localDir });
    return summary;
  } finally {
    await db.query('ROLLBACK').catch(() => {});
    if (locked) await db.query("select pg_advisory_unlock(hashtext('zyteron:fiscal-backup'))").catch(() => {});
    await db.end(); key.fill(0);
  }
}
export function openManifest(bytes, signer) {
  const { signature, ...header } = JSON.parse(bytes.toString());
  if (header.version !== 1 || header.companyRut !== company || header.signerFingerprint !== signer.fingerprint) throw Error('FISCAL_BACKUP_IDENTITY');
  if (!verify('sha256', json(header), signer.cert.publicKey, Buffer.from(signature, 'base64'))) throw Error('FISCAL_BACKUP_SIGNATURE');
  const key = privateDecrypt({ key: signer.key, oaepHash: 'sha256' }, Buffer.from(header.wrappedKey, 'base64'));
  const manifest = JSON.parse(unseal(Buffer.from(header.payload, 'base64'), key, `ZYTERON:FISCAL:MANIFEST:${header.id}`).toString());
  if (manifest.companyRut !== company || manifest.version !== 1) throw Error('FISCAL_BACKUP_IDENTITY');
  return { manifest, key, header };
}
export async function exportFiscalBackup({ env = process.env, manifestPath, destination }) {
  const store = storage(env), signer = certificate(env);
  await mkdir(destination, { recursive: false, mode: 0o700 });
  const bytes = await download(store, bucket, manifestPath);
  const { manifest, key } = openManifest(bytes, signer);
  try {
    await writeFile(resolve(destination, 'manifest.enc'), bytes, { flag: 'wx', mode: 0o600 });
    await mkdir(resolve(destination, 'objects'), { mode: 0o700 });
    await inPairs(manifest.entries, async entry => {
      const data = await download(store, bucket, entry.path);
      const plain = unseal(data, key, entry.aad);
      if (digest(plain) !== entry.sha256 || plain.length !== entry.size) throw Error('FISCAL_BACKUP_HASH');
      await writeFile(safeDestination(destination, `objects/${entry.sha256}.enc`), data, { mode: 0o600 });
    });
    return { files: manifest.objects.length, tables: manifest.tables.length, manifestSha256: digest(bytes) };
  } finally { key.fill(0); }
}
export async function restoreFiscalArchive({ env = process.env, source, destination }) {
  const { manifest, key } = openManifest(await readFile(resolve(source, 'manifest.enc')), certificate(env));
  try {
    await mkdir(destination, { recursive: false, mode: 0o700 });
    for (const entry of manifest.entries) {
      const data = await readFile(safeDestination(source, `objects/${entry.sha256}.enc`));
      const plain = unseal(data, key, entry.aad);
      if (digest(plain) !== entry.sha256 || plain.length !== entry.size) throw Error('FISCAL_BACKUP_HASH');
      const target = safeDestination(destination, entry.relative);
      await mkdir(resolve(target, '..'), { recursive: true, mode: 0o700 });
      const file = await open(target, 'wx', 0o600); try { await file.writeFile(plain); } finally { await file.close(); }
    }
    await writeFile(resolve(destination, 'manifest.json'), json(manifest), { flag: 'wx', mode: 0o600 });
    return { state: 'RESTORED_AND_VERIFIED', tables: manifest.tables.length, rows: manifest.tables.reduce((n, t) => n + t.rows, 0), files: manifest.objects.length, databaseModified: false };
  } finally { key.fill(0); }
}
export function startFiscalBackupWorker() {
  if (process.env.FISCAL_BACKUP_ENABLED !== 'true') return;
  let inflight = false;
  const run = async () => { if (inflight) return; inflight = true; try { console.log('FISCAL_BACKUP', JSON.stringify(await createFiscalBackup())); } catch {
    console.error('FISCAL_BACKUP_FAILED: revisar respaldo fiscal');
    let db;
    try { db = await database(process.env); await db.query(`insert into public.finance_notifications(event_key,audience_role,type,title,body,entity_type,entity_id,href,severity)
      values($1,'FINANZAS','FISCAL_BACKUP_FAILED','El respaldo fiscal requiere revisión','No se confirmó un respaldo íntegro. Revisar el servicio antes de continuar con la emisión.','FISCAL_ARCHIVE','a7839877-4000-4000-8000-000000000001','/finance/settings#dte-integrations','CRITICAL') on conflict(event_key) do nothing`, ['fiscal-backup-failed:' + new Date().toISOString().slice(0, 10)]); } catch { console.error('FISCAL_BACKUP_ALERT_FAILED'); } finally { await db?.end(); }
  } finally { inflight = false; } };
  const first = setTimeout(run, 60000); first.unref();
  const timer = setInterval(run, 3600000); timer.unref();
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const result = command === 'create' ? await createFiscalBackup({ force: process.argv.includes('--force') }) : command === 'export' ? await exportFiscalBackup({ manifestPath: process.argv[3], destination: process.argv[4] }) : command === 'restore' ? await restoreFiscalArchive({ source: process.argv[3], destination: process.argv[4] }) : null;
  if (!result) throw Error('Uso: fiscal-backup.mjs create | export <manifest> <destino nuevo> | restore <origen> <destino nuevo>');
  console.log(JSON.stringify(result));
}

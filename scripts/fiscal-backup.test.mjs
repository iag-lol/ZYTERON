import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createPrivateKey, publicEncrypt, sign, X509Certificate } from 'node:crypto';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { seal, unseal, digest, safeDestination, openManifest, restoreFiscalArchive } from './fiscal-backup.mjs';

test('el cifrado autentica bytes, contexto y clave', () => {
  const key = randomBytes(32), bytes = Buffer.from('XML tributario íntegro\r\n'), encrypted = seal(bytes, key, 'company:78398774-0');
  assert.deepEqual(unseal(encrypted, key, 'company:78398774-0'), bytes);
  assert.throws(() => unseal(encrypted, key, 'company:otra'));
  assert.throws(() => unseal(encrypted, randomBytes(32), 'company:78398774-0'));
  const damaged = Buffer.from(encrypted); damaged[damaged.length - 1] ^= 1;
  assert.throws(() => unseal(damaged, key, 'company:78398774-0'));
});
test('la recuperación rechaza rutas fuera del destino', () => {
  for (const path of ['/tmp/a', '../a', 'a/../../b', 'a\\b', 'a//b', './a']) assert.throws(() => safeDestination('/tmp/recovery', path));
  assert.equal(safeDestination('/tmp/recovery', 'files/finance-documents/a.xml'), '/tmp/recovery/files/finance-documents/a.xml');
});
test('recupera todos los archivos sin conexión ni escrituras en producción y detecta alteraciones', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zyteron-fiscal-test-'));
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(root, 'key.pem'), '-out', join(root, 'cert.pem'), '-days', '1', '-subj', '/CN=ZYTERON test'], { stdio: 'ignore' });
    const pem = await readFile(join(root, 'cert.pem'), 'utf8'), keyPem = await readFile(join(root, 'key.pem'), 'utf8');
    const cert = new X509Certificate(pem), signer = { cert, key: createPrivateKey(keyPem), fingerprint: cert.fingerprint256.replaceAll(':', '').toLowerCase() };
    const env = { DTE_CERTIFICATE_PEM: keyPem + pem }, key = randomBytes(32), bytes = Buffer.from('<DTE>prueba\r\n</DTE>'), sha256 = digest(bytes), aad = 'test-file';
    const source = join(root, 'archive'); await mkdir(join(source, 'objects'), { recursive: true });
    const encrypted = seal(bytes, key, aad); await writeFile(join(source, 'objects', sha256 + '.enc'), encrypted);
    const manifest = { version: 1, companyRut: '78398774-0', entries: [{ relative: 'files/finance-documents/test.xml', sha256, size: bytes.length, aad }], tables: [{ table: 'tax_documents', rows: 1 }], objects: [{}] };
    const header = { version: 1, id: 'test', companyRut: '78398774-0', signerFingerprint: signer.fingerprint, wrappedKey: publicEncrypt({ key: cert.publicKey, oaepHash: 'sha256' }, key).toString('base64'), payload: seal(Buffer.from(JSON.stringify(manifest)), key, 'ZYTERON:FISCAL:MANIFEST:test').toString('base64') };
    const envelope = Buffer.from(JSON.stringify({ ...header, signature: sign('sha256', Buffer.from(JSON.stringify(header)), signer.key).toString('base64') }));
    await writeFile(join(source, 'manifest.enc'), envelope);
    const result = await restoreFiscalArchive({ env, source, destination: join(root, 'restored') });
    assert.equal(result.databaseModified, false); assert.equal(result.files, 1);
    assert.deepEqual(await readFile(join(root, 'restored/files/finance-documents/test.xml')), bytes);
    await assert.rejects(restoreFiscalArchive({ env, source, destination: join(root, 'restored') }));
    const changed = JSON.parse(envelope); changed.companyRut = 'otra';
    assert.throws(() => openManifest(Buffer.from(JSON.stringify(changed)), signer));
    changed.companyRut = '78398774-0'; changed.payload = changed.payload.slice(0, -4) + 'AAAA';
    assert.throws(() => openManifest(Buffer.from(JSON.stringify(changed)), signer));
    const badBlob = Buffer.from(encrypted); badBlob[40] ^= 1; await writeFile(join(source, 'objects', sha256 + '.enc'), badBlob);
    await assert.rejects(restoreFiscalArchive({ env, source, destination: join(root, 'damaged') }));
  } finally { await rm(root, { recursive: true, force: true }); }
});

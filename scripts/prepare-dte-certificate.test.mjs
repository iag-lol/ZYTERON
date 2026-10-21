import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createPrivateKey, X509Certificate, createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  existsSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import {
  findDownloadedCertificate,
  parseCertificateBundle,
  prepareCertificate,
  readHiddenPassword,
} from "./prepare-dte-certificate.mjs";

let root, pfx, pem, password;
const openssl = (args, input) =>
  execFileSync("/usr/bin/openssl", args, { input, stdio: ["pipe", "pipe", "pipe"] });
before(() => {
  root = mkdtempSync(join(tmpdir(), "zyteron-certificate-test-"));
  password = "Synthetic-only-ñ-42";
  const key = join(root, "test.key"),
    crt = join(root, "test.crt");
  pfx = join(root, "test.pfx");
  openssl([
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    key,
    "-out",
    crt,
    "-days",
    "2",
    "-subj",
    "/CN=Zyteron Synthetic QA",
  ]);
  openssl(
    ["pkcs12", "-export", "-out", pfx, "-inkey", key, "-in", crt, "-passout", "stdin"],
    password + "\n",
  );
  pem = Buffer.concat([readFileSync(key), readFileSync(crt)]);
});
after(() => rmSync(root, { recursive: true, force: true }));
test("export encrypts matching key with separate secret and private file modes, preserving original", () => {
  const before = createHash("sha256").update(readFileSync(pfx)).digest("hex");
  const result = prepareCertificate({ input: pfx, password, outputRoot: join(root, "private") });
  const encrypted = readFileSync(join(result.directory, "certificate.encrypted.pem"), "utf8");
  assert.match(encrypted, /BEGIN ENCRYPTED PRIVATE KEY/);
  assert.doesNotMatch(encrypted, /BEGIN (RSA )?PRIVATE KEY/);
  assert.throws(() => createPrivateKey(encrypted));
  const passphrase = readFileSync(join(result.directory, "passphrase.txt"), "utf8").trim();
  assert.notEqual(passphrase, password);
  const key = createPrivateKey({ key: encrypted, passphrase });
  const cert = new X509Certificate(
    encrypted.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)[0],
  );
  assert.equal(cert.checkPrivateKey(key), true);
  assert.equal(result.metadata.trustChainVerified, false);
  assert.equal(result.metadata.siiAuthorizationVerified, false);
  assert.equal(statSync(result.directory).mode & 0o777, 0o700);
  for (const name of [
    "certificate.encrypted.pem",
    "passphrase.txt",
    "metadata.json",
    "installation.txt",
  ])
    assert.equal(statSync(join(result.directory, name)).mode & 0o777, 0o600);
  assert.equal(createHash("sha256").update(readFileSync(pfx)).digest("hex"), before);
});
test("wrong password produces generic error and no export directory", () => {
  const outputRoot = join(root, "wrong");
  assert.throws(() => prepareCertificate({ input: pfx, password: "incorrect", outputRoot }), {
    message: "PFX_OPEN_FAILED",
  });
  assert.equal(existsSync(outputRoot), false);
});
test("invalid password and direct symlinks are rejected", () => {
  assert.throws(() => prepareCertificate({ input: pfx, password: "bad\nvalue" }), {
    message: "PFX_PASSWORD_INVALID",
  });
  const link = join(root, "link.pfx");
  symlinkSync(pfx, link);
  assert.throws(() => prepareCertificate({ input: link, password }), {
    message: "PFX_FILE_INVALID",
  });
});
test("expired and not yet valid certificates are rejected", () => {
  const cert = new X509Certificate(
    pem.toString().match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)[0],
  );
  assert.throws(() => parseCertificateBundle(pem, Date.parse(cert.validTo) + 1000), {
    message: "CERTIFICATE_EXPIRED",
  });
  assert.throws(() => parseCertificateBundle(pem, Date.parse(cert.validFrom) - 1000), {
    message: "CERTIFICATE_NOT_YET_VALID",
  });
});
test("mismatched and ambiguous keys are rejected", () => {
  const other = join(root, "other.key");
  openssl(["genrsa", "-out", other, "2048"]);
  const cert = pem
    .toString()
    .match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)[0];
  assert.throws(() => parseCertificateBundle(Buffer.from(readFileSync(other, "utf8") + cert)), {
    message: "CERTIFICATE_KEY_MISMATCH",
  });
  assert.throws(() => parseCertificateBundle(Buffer.concat([pem, readFileSync(other)])), {
    message: "CERTIFICATE_BUNDLE_INVALID",
  });
});
test("Git output and symlink into Git are rejected before writing credentials", () => {
  const repo = join(root, "repository");
  mkdirSync(repo);
  mkdirSync(join(repo, ".git"));
  assert.throws(() => prepareCertificate({ input: pfx, password, outputRoot: repo }), {
    message: "REPOSITORY_FORBIDDEN",
  });
  const link = join(root, "linked-output");
  symlinkSync(repo, link);
  assert.throws(() => prepareCertificate({ input: pfx, password, outputRoot: link }), {
    message: "REPOSITORY_FORBIDDEN",
  });
});
test("download discovery refuses ambiguous files and ignores symlinks", () => {
  const downloads = join(root, "downloads");
  mkdirSync(downloads);
  assert.throws(() => findDownloadedCertificate(downloads), { message: "DOWNLOAD_NOT_FOUND" });
  writeFileSync(join(downloads, "a.pfx"), "synthetic");
  symlinkSync(pfx, join(downloads, "link.p12"));
  assert.equal(findDownloadedCertificate(downloads), join(downloads, "a.pfx"));
  writeFileSync(join(downloads, "b.p12"), "synthetic");
  assert.throws(() => findDownloadedCertificate(downloads), { message: "MULTIPLE_DOWNLOADS" });
});
function fakeTerminal() {
  const input = new PassThrough(),
    output = new PassThrough();
  let shown = "";
  input.isTTY = true;
  input.isRaw = false;
  input.setRawMode = (value) => {
    input.isRaw = value;
  };
  output.on("data", (chunk) => (shown += chunk.toString()));
  return { input, output, shown: () => shown };
}
test("hidden input handles UTF-8 across chunks and restores terminal without echoing password", async () => {
  const terminal = fakeTerminal();
  const waiting = readHiddenPassword(terminal.input, terminal.output);
  const bytes = Buffer.from("test-ñ");
  terminal.input.write(bytes.subarray(0, bytes.length - 1));
  terminal.input.write(bytes.subarray(bytes.length - 1));
  terminal.input.write("\r");
  assert.equal(await waiting, "test-ñ");
  assert.equal(terminal.input.isRaw, false);
  assert.doesNotMatch(terminal.shown(), /test-|ñ/);
});
test("hidden input cancellation restores terminal", async () => {
  const terminal = fakeTerminal();
  const waiting = readHiddenPassword(terminal.input, terminal.output);
  terminal.input.write("\x03");
  await assert.rejects(waiting, { message: "CANCELLED" });
  assert.equal(terminal.input.isRaw, false);
});

import { createPrivateKey, randomBytes, X509Certificate } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import { StringDecoder } from "node:string_decoder";

const privateKeyPattern =
  /-----BEGIN (?:RSA |ENCRYPTED )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |ENCRYPTED )?PRIVATE KEY-----/g;
const certificatePattern = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;
const fail = (code) => {
  throw new Error(code);
};
function outsideRepository(path) {
  for (let current = resolve(path); ; current = dirname(current)) {
    if (existsSync(join(current, ".git"))) fail("REPOSITORY_FORBIDDEN");
    if (dirname(current) === current) break;
  }
}
export function findDownloadedCertificate(
  directory = join(homedir(), "Downloads"),
  now = Date.now(),
) {
  const candidates = readdirSync(directory)
    .map((name) => join(directory, name))
    .filter((path) => {
      const info = lstatSync(path);
      return (
        info.isFile() &&
        !info.isSymbolicLink() &&
        [".pfx", ".p12"].includes(extname(path).toLowerCase()) &&
        now - info.mtimeMs < 24 * 3600_000
      );
    });
  if (candidates.length !== 1)
    fail(candidates.length ? "MULTIPLE_DOWNLOADS" : "DOWNLOAD_NOT_FOUND");
  return candidates[0];
}
export function parseCertificateBundle(bytes, now = Date.now()) {
  const pem = bytes.toString("utf8"),
    keys = pem.match(privateKeyPattern) || [],
    certificates = pem.match(certificatePattern) || [];
  if (keys.length !== 1 || !certificates.length) fail("CERTIFICATE_BUNDLE_INVALID");
  const key = createPrivateKey(keys[0]);
  if (key.asymmetricKeyType !== "rsa") fail("CERTIFICATE_KEY_UNSUPPORTED");
  if ((key.asymmetricKeyDetails?.modulusLength || 0) < 2048) fail("CERTIFICATE_KEY_TOO_SMALL");
  const parsed = certificates.map((value) => new X509Certificate(value));
  const matching = parsed.filter((c) => c.checkPrivateKey(key));
  if (matching.length !== 1) fail("CERTIFICATE_KEY_MISMATCH");
  const certificate = matching[0];
  if (Date.parse(certificate.validFrom) > now) fail("CERTIFICATE_NOT_YET_VALID");
  if (Date.parse(certificate.validTo) <= now) fail("CERTIFICATE_EXPIRED");
  return {
    key,
    certificate,
    chain: parsed.filter((c) => c !== certificate),
    metadata: {
      fingerprintSha256: certificate.fingerprint256.replaceAll(":", "").toLowerCase(),
      subject: certificate.subject,
      issuer: certificate.issuer,
      validFrom: new Date(certificate.validFrom).toISOString(),
      expiresAt: new Date(certificate.validTo).toISOString(),
      keyMatches: true,
      trustChainVerified: false,
      siiAuthorizationVerified: false,
    },
  };
}
export function prepareCertificate({
  input,
  password,
  outputRoot = join(homedir(), "Library", "Application Support", "Zyteron", "Certificates"),
  now = Date.now(),
}) {
  const source = resolve(input),
    info = lstatSync(source);
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    ![".pfx", ".p12"].includes(extname(source).toLowerCase()) ||
    !info.size ||
    info.size > 1024 * 1024
  )
    fail("PFX_FILE_INVALID");
  if (!password || /[\r\n\0]/.test(password)) fail("PFX_PASSWORD_INVALID");
  outsideRepository(realpathSync(source));
  outsideRepository(outputRoot);
  let decoded;
  const passwordBytes = Buffer.from(password + "\n", "utf8");
  try {
    decoded = execFileSync(
      "/usr/bin/openssl",
      ["pkcs12", "-in", source, "-nodes", "-passin", "stdin"],
      {
        input: passwordBytes,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 15_000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );
  } catch {
    fail("PFX_OPEN_FAILED");
  } finally {
    passwordBytes.fill(0);
  }
  try {
    const { key, certificate, chain, metadata } = parseCertificateBundle(decoded, now);
    mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
    if (lstatSync(outputRoot).isSymbolicLink()) fail("OUTPUT_SYMLINK_FORBIDDEN");
    const realRoot = realpathSync(outputRoot);
    outsideRepository(realRoot);
    chmodSync(realRoot, 0o700);
    const directory = mkdtempSync(join(realRoot, "zyteron-dte-"));
    chmodSync(directory, 0o700);
    const passphrase = randomBytes(32).toString("base64url");
    const encrypted = key.export({
      type: "pkcs8",
      format: "pem",
      cipher: "aes-256-cbc",
      passphrase,
    });
    const bundle =
      String(encrypted) +
      "\n" +
      certificate.toString() +
      chain.map((c) => "\n" + c.toString()).join("");
    writeFileSync(join(directory, "certificate.encrypted.pem"), bundle, {
      mode: 0o600,
      flag: "wx",
    });
    writeFileSync(join(directory, "passphrase.txt"), passphrase + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    writeFileSync(join(directory, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    writeFileSync(
      join(directory, "installation.txt"),
      "Destino pendiente de aprobación: servicio ZYTERON en Render (srv-d7emn6dckfvc73ekrh70).\nDTE_CERTIFICATE_PEM: contenido de certificate.encrypted.pem\nDTE_CERTIFICATE_PEM_PASSPHRASE: contenido de passphrase.txt sin salto de línea final\nDTE_CERTIFICATE_SECRET_REF: DTE_CERTIFICATE_PEM\nDTE_SENDER_RUT: RUT del titular autorizado, verificado contra el certificado.\nRegistrar únicamente metadatos en Finanzas. Producción y emisión requieren autorización SII independiente.\n",
      { mode: 0o600, flag: "wx" },
    );
    return { directory, metadata };
  } finally {
    decoded?.fill(0);
  }
}
export function readHiddenPassword(input = process.stdin, output = process.stdout) {
  if (!input.isTTY || !input.setRawMode)
    return Promise.reject(new Error("INTERACTIVE_TERMINAL_REQUIRED"));
  output.write("Clave actual del archivo PFX (entrada oculta): ");
  return new Promise((resolve, reject) => {
    let password = "";
    const wasRaw = input.isRaw;
    const decoder = new StringDecoder("utf8");
    const finish = (error) => {
      input.off("data", receive);
      input.setRawMode(Boolean(wasRaw));
      input.pause();
      output.write("\n");
      const value = password;
      password = "";
      if (error) reject(error);
      else resolve(value);
    };
    const receive = (chunk) => {
      const data = decoder.write(chunk);
      if (data.startsWith("\x1b")) return;
      for (const character of data) {
        if (character === "\u0003") {
          finish(new Error("CANCELLED"));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b")
          password = Array.from(password).slice(0, -1).join("");
        else if (character >= " ") password += character;
      }
    };
    input.setRawMode(true);
    input.resume();
    input.on("data", receive);
  });
}
const messages = {
  ARGUMENTS_INVALID:
    "Uso: node scripts/prepare-dte-certificate.mjs [--file archivo.pfx] [--output carpeta_privada].",
  DOWNLOAD_NOT_FOUND: "No se encontró un certificado reciente en Descargas.",
  MULTIPLE_DOWNLOADS: "Hay varios certificados recientes. Usa --file para elegir el correcto.",
  REPOSITORY_FORBIDDEN:
    "El certificado y su salida deben estar fuera de cualquier repositorio Git.",
  PFX_FILE_INVALID: "El archivo PFX/P12 no es un archivo regular válido.",
  PFX_PASSWORD_INVALID: "La clave está vacía o contiene caracteres de control.",
  PFX_OPEN_FAILED: "No se pudo abrir el PFX. Revisa la clave y la compatibilidad de OpenSSL.",
  CERTIFICATE_BUNDLE_INVALID: "El archivo no contiene un certificado y una única llave privada.",
  CERTIFICATE_KEY_MISMATCH: "La llave privada no coincide con un único certificado.",
  CERTIFICATE_KEY_UNSUPPORTED: "El tipo de llave requiere revisión antes de integrarlo al SII.",
  CERTIFICATE_KEY_TOO_SMALL: "La llave RSA tiene menos de 2048 bits.",
  CERTIFICATE_NOT_YET_VALID: "El certificado todavía no está vigente.",
  CERTIFICATE_EXPIRED: "El certificado está vencido.",
  OUTPUT_SYMLINK_FORBIDDEN: "La carpeta de salida no puede ser un enlace simbólico.",
  INTERACTIVE_TERMINAL_REQUIRED:
    "Ejecuta esta herramienta directamente en Terminal para ingresar la clave sin mostrarla.",
  CANCELLED: "Operación cancelada.",
};
async function main() {
  const args = process.argv.slice(2),
    options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (
      !["--file", "--output"].includes(args[i]) ||
      !args[i + 1] ||
      args[i + 1].startsWith("--") ||
      options[args[i]]
    )
      fail("ARGUMENTS_INVALID");
    options[args[i]] = args[i + 1];
  }
  const input = options["--file"] || findDownloadedCertificate();
  console.log(
    "Preparación local del certificado de Zyteron. Sin conexiones de red ni envíos al SII.",
  );
  let password = "";
  try {
    password = await readHiddenPassword();
    const result = prepareCertificate({
      input,
      password,
      ...(options["--output"] ? { outputRoot: options["--output"] } : {}),
    });
    console.log("Certificado abierto: llave y certificado coinciden; vigencia comprobada.");
    console.log(
      "Vencimiento: " +
        new Date(result.metadata.expiresAt)
          .toLocaleString("es-CL", {
            timeZone: "America/Santiago",
            hour12: false,
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          .replaceAll("/", "-"),
    );
    console.log("Huella SHA-256: " + result.metadata.fingerprintSha256);
    console.log("Archivos privados: " + result.directory);
    console.log(
      "La clave de exportación se generó localmente y no se muestra. La instalación en Render y la autorización del SII siguen pendientes.",
    );
  } finally {
    password = "";
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(
      messages[error.message] ||
        "No fue posible preparar el certificado. Los detalles sensibles no se muestran.",
    );
    process.exitCode = 1;
  });

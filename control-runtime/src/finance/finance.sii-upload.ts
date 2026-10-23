import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import type { Writable } from "node:stream";
import { ServiceUnavailableException, UnprocessableEntityException } from "@nestjs/common";
import { formatRut, validRut } from "./finance.util.js";

/** RFC 1867: tamaño conocido, CRLF y bytes ISO-8859-1 sin recodificar el XML firmado. */
export function siiUploadBody(xml: string, senderRut: string, companyRut: string, fileName: string) {
  if (!validRut(senderRut) || !validRut(companyRut) || !/^[a-zA-Z0-9_.-]{1,100}\.xml$/.test(fileName))
    throw new UnprocessableEntityException("Identidad del archivo SII inválida.");
  if (/[^\x09\x0a\x0d\x20-\xff]/.test(xml))
    throw new UnprocessableEntityException("XML no representable en ISO-8859-1.");
  const [sender, senderDv] = formatRut(senderRut).split("-"),
    [company, companyDv] = formatRut(companyRut).split("-"),
    boundary = `---------------------------${randomBytes(16).toString("hex")}`;
  const fields = { rutSender: sender, dvSender: senderDv, rutCompany: company, dvCompany: companyDv };
  const parts = Object.entries(fields).map(([name, value]) =>
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`, "ascii"),
  );
  parts.push(
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="archivo"; filename="${fileName}"\r\nContent-Type: text/xml\r\n\r\n`, "ascii"),
    Buffer.from(xml, "latin1"),
    Buffer.from(`\r\n--${boundary}--\r\n`, "ascii"),
  );
  const body = Buffer.concat(parts);
  return {
    body,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.length),
      Accept: "application/xml, text/xml, */*",
      "Accept-Language": "es-cl",
      "Cache-Control": "no-cache",
      "User-Agent": "Mozilla/4.0 (compatible; PROG 1.0; Windows NT 5.0; YComp 5.0.2.4)",
    },
  };
}

export function siiHttp10Available() {
  return spawnSync("curl", ["--version"], { timeout: 2000, stdio: "ignore" }).status === 0;
}

/** HTTP/1.0 del protocolo oficial. Token y XML viajan por pipes privados, nunca por argumentos ni archivos temporales. */
export async function siiHttp10Upload(host: string, token: string, upload: ReturnType<typeof siiUploadBody>) {
  if (!["maullin.sii.cl", "palena.sii.cl"].includes(host) || !/^[A-Za-z0-9_-]{8,500}$/.test(token))
    throw new UnprocessableEntityException("Destino o autenticación SII inválidos.");
  const args = ["--config", "-", "--silent", "--show-error", "--http1.0", "--proto", "=https",
    "--connect-timeout", "15", "--max-time", "60", "--request", "POST", "--data-binary", "@/dev/fd/3",
    "--write-out", "\n%{http_code}", "--url", `https://${host}/cgi_dte/UPL/DTEUpload`];
  const config = Object.entries({ ...upload.headers, Cookie: `TOKEN=${token}` })
    .map(([name, value]) => `header = ${JSON.stringify(`${name}: ${value}`)}`).join("\n") + "\n";
  const raw = await new Promise<Buffer>((resolve, reject) => {
    const child = spawn("curl", args, { stdio: ["pipe", "pipe", "pipe", "pipe"], timeout: 65000 });
    const chunks: Buffer[] = [];
    let bytes = 0, overflow = false;
    child.stdout!.on("data", (data: Buffer) => {
      bytes += data.length;
      if (bytes > 1024 * 1024) { overflow = true; child.kill(); }
      else chunks.push(data);
    });
    child.stderr!.resume();
    child.on("error", () => reject(new ServiceUnavailableException("Transporte HTTP/1.0 SII no disponible; recepción no confirmada.")));
    child.on("close", code => {
      if (overflow || code !== 0) reject(new ServiceUnavailableException(`SII HTTP/1.0 sin recepción confirmada (${overflow ? "respuesta excesiva" : `curl ${code ?? "interrumpido"}`}).`));
      else resolve(Buffer.concat(chunks));
    });
    child.stdin!.on("error", () => {});
    const payload = child.stdio[3] as Writable;
    payload.on("error", () => {});
    child.stdin!.end(config);
    payload.end(upload.body);
  });
  const separator = raw.lastIndexOf(10), status = Number(raw.subarray(separator + 1).toString("ascii"));
  if (separator < 0 || status < 200 || status >= 300)
    throw new ServiceUnavailableException(`SII HTTP/1.0 respondió ${status || "sin estado"}; recepción no confirmada.`);
  return raw.subarray(0, separator).toString("latin1");
}

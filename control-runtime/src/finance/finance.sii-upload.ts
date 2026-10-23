import { randomBytes } from "node:crypto";
import { UnprocessableEntityException } from "@nestjs/common";
import { normalizeRut, validRut } from "./finance.util.js";

/** RFC 1867: tamaño conocido, CRLF y bytes ISO-8859-1 sin recodificar el XML firmado. */
export function siiUploadBody(xml: string, senderRut: string, companyRut: string, fileName: string) {
  if (!validRut(senderRut) || !validRut(companyRut) || !/^[a-zA-Z0-9_.-]{1,100}\.xml$/.test(fileName))
    throw new UnprocessableEntityException("Identidad del archivo SII inválida.");
  if (/[^\x09\x0a\x0d\x20-\xff]/.test(xml))
    throw new UnprocessableEntityException("XML no representable en ISO-8859-1.");
  const [sender, senderDv] = normalizeRut(senderRut).split("-"),
    [company, companyDv] = normalizeRut(companyRut).split("-"),
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

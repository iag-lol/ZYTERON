import { SignedXml } from "xml-crypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { createHash, X509Certificate } from "node:crypto";
import { UnprocessableEntityException } from "@nestjs/common";
import { DSIG_NS, SII_NS, XSI_NS } from "./finance.dte-providers.js";
import { parseXml } from "./finance.formats.js";

/** Verificación criptográfica y referencias locales. La integridad no acredita por sí sola facultades ante el SII. */
export function verifySiiXmlSignatures(xml: string, expectedFingerprint?: string) {
  parseXml(xml);
  const reject = (message: string): never => {
    throw new UnprocessableEntityException(message);
  };
  const dom = new DOMParser({ onError: () => reject("XML de firma mal formado.") }).parseFromString(
    xml,
    "text/xml",
  );
  const elements = Array.from(dom.getElementsByTagName("*")),
    ids = new Map<string, (typeof elements)[number]>();
  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.toLowerCase() !== "id") continue;
      if (ids.has(attribute.value) || attribute.name !== "ID")
        reject("ID duplicado o variante de ID no permitida.");
      ids.set(attribute.value, element);
    }
  }
  const signatures = Array.from(dom.getElementsByTagNameNS(DSIG_NS, "Signature"));
  if (!signatures.length) reject("XML sin firma electrónica.");
  const results: Array<{
    id: string;
    fingerprint: string;
    signedXml: string;
    digestValue: string;
  }> = [];
  for (const signature of signatures) {
    const refs = Array.from(signature.getElementsByTagNameNS(DSIG_NS, "Reference"));
    if (refs.length !== 1) reject("La firma requiere una referencia local única.");
    const uri = refs[0]!.getAttribute("URI") ?? "";
    if (!/^#[A-Za-z_][A-Za-z0-9_.-]*$/.test(uri))
      reject("Referencia externa o vacía no permitida.");
    const id = uri.slice(1),
      target = ids.get(id);
    const parent = signature.parentNode;
    if (!target || target.parentNode !== parent || (target.namespaceURI !== SII_NS && !(target.namespaceURI === null && parent?.nodeName === "DTE" && parent.parentNode === dom)))
      reject("Firma fuera del contenedor de su referencia.");
    const certs = Array.from(signature.getElementsByTagNameNS(DSIG_NS, "X509Certificate"));
    if (certs.length !== 1) reject("Certificado de firma ausente o ambiguo.");
    let cert: X509Certificate;
    try {
      cert = new X509Certificate(Buffer.from(certs[0]!.textContent!.replace(/\s/g, ""), "base64"));
    } catch {
      return reject("Certificado de firma inválido.");
    }
    const fingerprint = createHash("sha256").update(cert.raw).digest("hex");
    if (expectedFingerprint && fingerprint !== expectedFingerprint.toLowerCase().replace(/:/g, ""))
      reject("El firmante no corresponde al certificado esperado.");
    const digestMethods = Array.from(refs[0]!.getElementsByTagNameNS(DSIG_NS, "DigestMethod"));
    const transforms = Array.from(refs[0]!.getElementsByTagNameNS(DSIG_NS, "Transform"));
    if (digestMethods.length !== 1 || digestMethods[0]!.getAttribute("Algorithm") !== "http://www.w3.org/2000/09/xmldsig#sha1" ||
      transforms.some(transform => transform.getAttribute("Algorithm") !== "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"))
      reject("Digest o transformación ajenos al formato SII.");
    let verifier = new SignedXml({ publicCert: cert.toString(), getCertFromKeyInfo: () => null });
    try {
      verifier.loadSignature(new XMLSerializer().serializeToString(signature));
      if (
        verifier.canonicalizationAlgorithm !== "http://www.w3.org/TR/2001/REC-xml-c14n-20010315" ||
        verifier.signatureAlgorithm !== "http://www.w3.org/2000/09/xmldsig#rsa-sha1"
      )
        reject("Algoritmo ajeno al formato SII.");
      if (!verifier.checkSignature(xml)) {
        // El validador de DTE del SII verifica cada documento antes de heredar los namespaces del sobre.
        if (parent?.nodeName !== "DTE" || !["Documento", "Liquidacion", "Exportaciones"].includes(target!.localName ?? ""))
          reject("Firma electrónica o digest inválido.");
        const candidates = [...xml.matchAll(/<DTE\b[^>]*>[\s\S]*?<\/DTE>/g)]
          .map(match => match[0])
          .filter(fragment => {
            const isolated = new DOMParser().parseFromString(fragment, "text/xml");
            return Array.from(isolated.documentElement!.childNodes).some(node =>
              node.nodeType === 1 && (node as unknown as (typeof elements)[number]).getAttribute("ID") === id);
          });
        if (candidates.length !== 1) reject("DTE individual ausente o ambiguo.");
        const isolated = candidates[0]!.replace(/^<DTE\b[^>]*>/, opening => opening
          .replace(` xmlns="${SII_NS}"`, "")
          .replace(` xmlns:xsi="${XSI_NS}"`, ""));
        // El intercambio SII también firma DTE con namespace propio, sin el xsi del sobre.
        let valid = false;
        for (const candidate of new Set([candidates[0]!, isolated])) {
          verifier = new SignedXml({ publicCert: cert.toString(), getCertFromKeyInfo: () => null });
          verifier.loadSignature(new XMLSerializer().serializeToString(signature));
          if (verifier.checkSignature(candidate)) {
            valid = true;
            break;
          }
        }
        if (!valid) reject("Firma electrónica o digest inválido.");
      }
    } catch {
      return reject("No se pudo verificar la firma electrónica y su digest.");
    }
    const signed = verifier.getSignedReferences();
    if (signed.length !== 1) reject("Referencia firmada ambigua.");
    results.push({
      id,
      fingerprint,
      signedXml: signed[0]!,
      digestValue: refs[0]!.getElementsByTagNameNS(DSIG_NS, "DigestValue")[0]!.textContent!,
    });
  }
  return results;
}

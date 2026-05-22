import { generateZyteronOgImage, ogImageSize } from "@/lib/og-image";

export const size = ogImageSize;

export const contentType = "image/png";

export default function OpenGraphImage() {
  return generateZyteronOgImage({
    title: "Webs, sistemas y soporte TI para empresas",
    subtitle: "Desarrollo digital para pymes y empresas en Chile",
    tag: "ZYTERON",
  });
}

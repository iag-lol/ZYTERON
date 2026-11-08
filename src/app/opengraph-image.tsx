import { generateZyteronOgImage, ogImageSize } from "@/lib/og-image";

export const size = ogImageSize;

export const contentType = "image/png";

export default function OpenGraphImage() {
  return generateZyteronOgImage({
    title: "Software y soluciones digitales a medida",
    subtitle: "Sistemas, personas, operaciones, ecommerce y sitios web en Chile",
    tag: "ZYTERON",
  });
}

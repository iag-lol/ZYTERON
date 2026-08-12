import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CiudadDetalleRedirect({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(slug === "santiago" ? "/desarrollo-web-santiago" : "/desarrollo-web");
}

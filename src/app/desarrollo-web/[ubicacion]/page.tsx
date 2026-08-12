import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ ubicacion: string }>;
};

export default async function DesarrolloWebUbicacionRedirect({ params }: Props) {
  const { ubicacion } = await params;
  permanentRedirect(ubicacion === "santiago" ? "/desarrollo-web-santiago" : "/desarrollo-web");
}

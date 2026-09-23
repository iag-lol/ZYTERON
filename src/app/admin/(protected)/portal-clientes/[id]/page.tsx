import { redirect } from "next/navigation";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function AdminPortalClienteDetallePage({ params }: Params) {
  const { id } = await params;
  redirect(`/admin/clientes/${id}`);
}

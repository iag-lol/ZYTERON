import Workspace from "./workspace";
import { controlSnapshot } from "@/lib/client-experience/control-snapshot";
export async function ConnectedControlView({
  section = "inicio",
  id = "",
  search = "",
  action = "",
}: {
  section?: string;
  id?: string;
  search?: string;
  action?: string;
}) {
  const data = await controlSnapshot();
  return (
    <Workspace
      key={[section, id, search, action].join(":")}
      data={data}
      section={section}
      initialId={id}
      initialSearch={search}
      initialAction={action}
    />
  );
}

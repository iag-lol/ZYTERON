import { redirect } from "@control/lib/server-navigation";

export default function Home() {
  redirect("/dashboard");
}

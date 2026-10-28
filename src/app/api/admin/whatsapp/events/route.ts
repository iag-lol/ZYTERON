import { randomUUID } from "node:crypto";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { supabase } = createSupabaseServerClient();
  let close = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const emit = (event: string, data: unknown) => {
        if (!closed)
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
            );
          } catch {
            close();
          }
      };
      const channel = supabase
        .channel(`admin-whatsapp-${randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sales_threads" },
          (payload) => {
            const row = payload.new as { id?: string; channel?: string };
            if (row.channel === "WEB_CHAT" && row.id) emit("inbox", { source: "web", id: row.id });
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "sales_messages" },
          (payload) => {
            const row = payload.new as { thread_id?: string };
            if (row.thread_id) emit("inbox", { source: "web", id: row.thread_id });
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "whatsapp_conversations" },
          (payload) => {
            if (payload.new && Object.keys(payload.new).length) emit("conversation", payload.new);
            else emit("refresh", {});
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "whatsapp_messages" },
          (payload) => {
            if (payload.new && Object.keys(payload.new).length) emit("message", payload.new);
            else emit("refresh", {});
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "zyteron_contact_events" },
          () => emit("contact", {}),
        );
      const heartbeat = setInterval(() => emit("heartbeat", {}), 15000);
      const deadline = setTimeout(() => close(), 60000);
      close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(deadline);
        req.signal.removeEventListener("abort", close);
        void supabase.removeChannel(channel);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", close, { once: true });
      channel.subscribe((status) => emit("connection", { connected: status === "SUBSCRIBED" }));
      if (req.signal.aborted) close();
    },
    cancel() {
      close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

"use client";
type LiveEvent = "connection" | "conversation" | "message" | "refresh" | "contact" | "inbox";
type Listener = (event: LiveEvent, data: unknown) => void;
const listeners = new Set<Listener>();
let stream: EventSource | null = null;
export function subscribeContactLive(listener: Listener) {
  listeners.add(listener);
  if (!stream) {
    stream = new EventSource("/api/admin/whatsapp/events");
    for (const kind of [
      "connection",
      "conversation",
      "message",
      "refresh",
      "contact",
      "inbox",
    ] as LiveEvent[])
      stream.addEventListener(kind, (event) => {
        try {
          const data = JSON.parse((event as MessageEvent<string>).data);
          for (const next of listeners) next(kind, data);
        } catch {}
      });
    stream.onerror = () => {
      for (const next of listeners) next("connection", { connected: false });
    };
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      stream?.close();
      stream = null;
    }
  };
}

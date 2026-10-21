export type ThreadMessage = {
  id: string;
  created_at: string;
  direction: string;
  content: string | null;
};
export function mergeThreadMessages<T extends ThreadMessage>(current: T[], incoming: T[]) {
  const server = new Map(incoming.map((m) => [m.id, m]));
  const remaining = [...incoming];
  const result = current.flatMap((m) => {
    if (m.id.startsWith("temp-")) {
      const index = remaining.findIndex(
        (s) => s.direction === m.direction && s.content === m.content,
      );
      if (index >= 0) {
        remaining.splice(index, 1);
        return [];
      }
    }
    return [server.get(m.id) || m];
  });
  const ids = new Set(result.map((m) => m.id));
  result.push(...incoming.filter((m) => !ids.has(m.id)));
  return result.sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id),
  );
}
export function nearThreadBottom(scrollTop: number, scrollHeight: number, clientHeight: number) {
  return scrollHeight - scrollTop - clientHeight <= 80;
}
export function threadAnchorTop(previousTop: number, previousHeight: number, nextHeight: number) {
  return previousTop + Math.max(0, nextHeight - previousHeight);
}

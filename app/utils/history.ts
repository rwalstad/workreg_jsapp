export async function saveHistory(itemId: string, path: string) {
  await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, path }),
  });
}
export async function fetchHistory() {
  const res = await fetch("/api/history", { method: "GET" });
  const data = await res.json();
  return data.history ?? [];
}

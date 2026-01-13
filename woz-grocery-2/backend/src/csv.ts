import type { SessionState } from "./store.js";

function escapeCsv(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function formatTimestampPST(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

}


export function sessionToCsv(session: SessionState): string {
  const header = ["timestamp", "role", "message", "tone", "imageName", "notes"].join(",");

  const rows = session.transcript.map((m) => {
    const ts = escapeCsv(formatTimestampPST(m.timestamp));
    const role = m.role;
    const msg = escapeCsv(m.message);
    const tone = escapeCsv(m.tone ?? "");
    const imageName = escapeCsv(m.imageName ?? "");
    const notes = escapeCsv(m.notes ?? "");
    return [ts, role, msg, tone, imageName, notes].join(",");
  });

  return [header, ...rows].join("\n");
}

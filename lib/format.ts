const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${hours}:${minutes} UTC`;
}

export function formatLatency(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 90) return `${minutes} min after first seen`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hr after first seen`;
  const days = Math.round(hours / 24);
  return `${days} days after first seen`;
}

export function excerpt(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

export function formatAgeDays(days: number | null): string {
  if (days === null) return "unknown";
  if (days < 365) return `${days}d`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

export function matchLabel(kind: "exact" | "near" | "template"): string {
  if (kind === "exact") return "Exact clone";
  if (kind === "near") return "Near duplicate";
  return "Template skeleton";
}

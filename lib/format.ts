const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonthDay(isoDate: string): string {
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  if (!month || !day) return isoDate;
  return `${MONTHS[month - 1]} ${day}`;
}

/** Inclusive UTC dates, YYYY-MM-DD. */
export function eachUtcDay(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start.slice(0, 10)}T00:00:00.000Z`);
  const last = Date.parse(`${end.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last)) return days;
  while (cursor.getTime() <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** "Oct 4–21, 2026" when the window stays in one month. */
export function formatWindowLabel(start: string, end: string): string {
  const startMonth = Number(start.slice(5, 7));
  const endMonth = Number(end.slice(5, 7));
  const startDay = Number(start.slice(8, 10));
  const endDay = Number(end.slice(8, 10));
  const startYear = start.slice(0, 4);
  const endYear = end.slice(0, 4);
  if (startYear === endYear && startMonth === endMonth) {
    return `${MONTHS[startMonth - 1]} ${startDay}–${endDay}, ${endYear}`;
  }
  if (startYear === endYear) {
    return `${MONTHS[startMonth - 1]} ${startDay}–${MONTHS[endMonth - 1]} ${endDay}, ${endYear}`;
  }
  return `${formatMonthDay(start)}, ${startYear}–${formatMonthDay(end)}, ${endYear}`;
}

const etFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const etDayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar day in US Eastern, which is EDT (UTC−4) for this October window. */
export function etDay(iso: string): string {
  const parts = etDayFormat.formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** "Oct 21, 7:27 AM ET". */
export function formatEtStamp(iso: string): string {
  const parts = etFormat.formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("month")} ${value("day")}, ${value("hour")}:${value("minute")} ${value("dayPeriod")} ET`;
}

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

/** "1 post" / "2 posts". Pass an explicit plural when it is not singular + s. */
export function countNoun(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Drop empty segments so a zero exact/near/template count is not printed. */
export function joinPresent(parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}

/**
 * Display-only ellipsis for stored text that was cut off.
 * The corpus text is left unchanged. Text that already ends in an ellipsis is left as stored.
 */
export function displayPostText(text: string, truncated?: boolean): string {
  if (!truncated) return text;
  const trimmed = text.trimEnd();
  if (trimmed.endsWith("…") || trimmed.endsWith("...")) return text;
  return `${trimmed}…`;
}

/** Earliest public post URL for an account, or the X profile when the corpus has no URL. */
export function accountSourceUrl(
  handle: string,
  posts: { account: string; postedAt: string; url?: string }[],
): string {
  let url: string | undefined;
  let at = "";
  for (const post of posts) {
    if (post.account !== handle || !post.url) continue;
    if (!url || post.postedAt < at) {
      url = post.url;
      at = post.postedAt;
    }
  }
  return url ?? `https://x.com/${handle}`;
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

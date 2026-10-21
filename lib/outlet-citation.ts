import { RECOGNIZED_NEWS_OUTLETS, SYNDICATING_OUTLETS } from "./wires";

/**
 * t.co hides the destination host. These are expanded targets of short links
 * in the corpus that land on a listed outlet's domain. Any other short link
 * stays unresolved and is not an outlet citation. The copy rule reads the
 * domain; it does not special-case an account or a headline.
 */
export const SHORT_LINK_TARGETS: Readonly<Record<string, string>> = {
  Fzv5PhYpD1: "https://www.cbsnews.com/news/federal-agents-seek-noncitizen-voters/",
};

type ListedOutlet = {
  domains: readonly string[];
  namePattern: RegExp | null;
};

const NAMES = new Map<string, Set<string>>();
const DOMAINS = new Map<string, Set<string>>();
const LISTED = new Map<string, ListedOutlet>();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addOutlet(handle: string, names: readonly string[], domains: readonly string[]): void {
  const nameSet = NAMES.get(handle) ?? new Set<string>();
  const domainSet = DOMAINS.get(handle) ?? new Set<string>();
  for (const name of names) {
    const cleaned = name.trim();
    if (cleaned) nameSet.add(cleaned);
  }
  for (const domain of domains) domainSet.add(domain.toLowerCase());
  NAMES.set(handle, nameSet);
  DOMAINS.set(handle, domainSet);
}

for (const outlet of SYNDICATING_OUTLETS) addOutlet(outlet.handle, [outlet.name], outlet.domains);
for (const outlet of RECOGNIZED_NEWS_OUTLETS) {
  addOutlet(outlet.handle, [outlet.label, ...outlet.names], outlet.domains);
}

for (const [handle, nameSet] of NAMES) {
  const nameList = [...nameSet].sort((a, b) => b.length - a.length);
  LISTED.set(handle, {
    domains: [...(DOMAINS.get(handle) ?? [])],
    namePattern:
      nameList.length === 0 ? null : new RegExp(`\\b(?:${nameList.map(escapeRegExp).join("|")})\\b`, "i"),
  });
}

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

export function isListedOutlet(handle: string): boolean {
  return LISTED.has(handle);
}

/** Expand a known t.co code. Every other URL is returned unchanged. */
export function resolveLinkedUrl(raw: string): string {
  const trimmed = raw.replace(/[),.;:!?]+$/g, "");
  let host = "";
  let code = "";
  try {
    const url = new URL(trimmed);
    host = url.hostname.toLowerCase().replace(/^www\./, "");
    code = url.pathname.replace(/^\//, "");
  } catch {
    return trimmed;
  }
  if (host === "t.co" && SHORT_LINK_TARGETS[code]) return SHORT_LINK_TARGETS[code];
  return trimmed;
}

function linkedHosts(text: string): string[] {
  const hosts: string[] = [];
  URL_RE.lastIndex = 0;
  for (const match of text.matchAll(URL_RE)) {
    const resolved = resolveLinkedUrl(match[0]);
    try {
      const host = new URL(resolved).hostname.toLowerCase().replace(/^www\./, "");
      if (host && host !== "t.co") hosts.push(host);
    } catch {
      // A broken URL is not a citation.
    }
  }
  return hosts;
}

function hostCites(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * True when the text links this outlet's domain or names the outlet.
 * The outlet's own later post does not count; callers pass the earlier post.
 */
export function textCitesOutlet(text: string, handle: string): boolean {
  const outlet = LISTED.get(handle);
  if (!outlet) return false;
  const hosts = linkedHosts(text);
  if (hosts.some((host) => outlet.domains.some((domain) => hostCites(host, domain)))) return true;
  return outlet.namePattern?.test(text) ?? false;
}

/**
 * True when this desk shares a domain with another listed outlet and the text
 * names that outlet. A local desk running the outlet's lede is that outlet's
 * own article, same as a post whose earlier citation links the domain.
 */
export function textNamesSisterOutlet(text: string, handle: string): boolean {
  const outlet = LISTED.get(handle);
  if (!outlet) return false;
  for (const [other, sister] of LISTED) {
    if (other === handle) continue;
    const shared = outlet.domains.some((domain) => sister.domains.includes(domain));
    if (shared && textCitesOutlet(text, other)) return true;
  }
  return false;
}

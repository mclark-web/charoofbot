import corpusJson from "@/data/corpus.json";
import { parseCreatedAt } from "./age";
import { analyzeCorpus } from "./detect";
import { DEMO_PASTE_STAMP } from "./thresholds";
import type {
  AccountReport,
  AnnotatedPost,
  Corpus,
  FixturePost,
  PostAction,
  Report,
} from "./types";

export type PasteParse = {
  posts: FixturePost[];
  warnings: string[];
};

const HANDLE_LINE = /^@([A-Za-z0-9_]{1,15})$/;
const HANDLE_WITH_AGE =
  /^@([A-Za-z0-9_]{1,15})\s+(joined|created|accountcreatedat|age|agedays)\s*:\s*(\S+)\s*$/i;
const HANDLE_PREFIX = /^@([A-Za-z0-9_]{1,15})\s*:\s*([\s\S]*)$/;
const JOINED_LINE = /^(?:joined|created|accountcreatedat)\s*:\s*(\S+)\s*$/i;
const AGE_LINE = /^(?:age|agedays)\s*:\s*(\d+)\s*(?:d|days)?\s*$/i;

export function parsePaste(raw: string, stamp = DEMO_PASTE_STAMP): PasteParse {
  const warnings: string[] = [];
  const trimmed = raw.trim();
  if (!trimmed) return { posts: [], warnings };

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return parseJson(trimmed, stamp);
    } catch {
      warnings.push("That looked like JSON but did not parse. Read as plain text instead.");
    }
  }

  const blocks = splitBlocks(trimmed);
  const posts = blocks.slice(0, 20).map((block, index) => toPost(block, index, stamp));
  if (blocks.length > 20) {
    warnings.push("Only the first 20 pasted posts were scored.");
  }
  warnOnUnparsedAges(posts, warnings);
  return { posts: posts.filter((post) => post.text.length > 0), warnings };
}

function splitBlocks(raw: string): string[] {
  if (/^\s*---\s*$/m.test(raw)) {
    return raw
      .split(/^\s*---\s*$/m)
      .map((block) => block.trim())
      .filter(Boolean);
  }
  const chunks = raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const handled = chunks.filter((chunk) => {
    const first = chunk.split("\n")[0]?.trim() ?? "";
    return HANDLE_LINE.test(first) || HANDLE_WITH_AGE.test(first);
  });
  if (chunks.length > 1 && handled.length === chunks.length) return chunks;
  return [raw.trim()];
}

function applyAgeToken(
  kind: string,
  value: string,
  target: { accountCreatedAt?: string; ageDays?: number },
) {
  if (/^age/i.test(kind)) {
    const days = Number(value.replace(/d(?:ays)?$/i, ""));
    if (Number.isFinite(days) && days >= 0) target.ageDays = Math.floor(days);
    return;
  }
  target.accountCreatedAt = value;
}

function takeAgeLines(lines: string[]): {
  text: string;
  accountCreatedAt?: string;
  ageDays?: number;
} {
  const target: { accountCreatedAt?: string; ageDays?: number } = {};
  const kept: string[] = [];
  for (const line of lines) {
    const joined = line.trim().match(JOINED_LINE);
    if (joined) {
      target.accountCreatedAt = joined[1];
      continue;
    }
    const age = line.trim().match(AGE_LINE);
    if (age) {
      target.ageDays = Number(age[1]);
      continue;
    }
    kept.push(line);
  }
  return { text: kept.join("\n").trim(), ...target };
}

function toPost(block: string, index: number, stamp: string): FixturePost {
  const lines = block.split("\n");
  const first = lines[0]?.trim() ?? "";
  let account = "pasted";
  let bodyLines = lines;
  const age: { accountCreatedAt?: string; ageDays?: number } = {};

  const handleLine = first.match(HANDLE_LINE);
  const handleAge = first.match(HANDLE_WITH_AGE);
  if ((handleLine && lines.length > 1) || handleAge) {
    account = (handleAge?.[1] ?? handleLine?.[1] ?? "pasted").toLowerCase();
    if (handleAge) applyAgeToken(handleAge[2], handleAge[3], age);
    bodyLines = lines.slice(1);
  } else {
    const prefixed = block.trim().match(HANDLE_PREFIX);
    if (prefixed) {
      account = prefixed[1].toLowerCase();
      bodyLines = prefixed[2].split("\n");
    }
  }

  const taken = takeAgeLines(bodyLines);
  if (taken.accountCreatedAt) age.accountCreatedAt = taken.accountCreatedAt;
  if (taken.ageDays !== undefined) age.ageDays = taken.ageDays;

  return {
    id: `paste-${index + 1}`,
    account,
    text: taken.text,
    postedAt: new Date(Date.parse(stamp) + index * 60_000).toISOString(),
    narrativeId: null,
    action: "post",
    ...(age.accountCreatedAt ? { accountCreatedAt: age.accountCreatedAt } : {}),
    ...(age.ageDays !== undefined ? { ageDays: age.ageDays } : {}),
  };
}

function parseJson(raw: string, stamp: string): PasteParse {
  const warnings: string[] = [];
  const data: unknown = JSON.parse(raw);
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { posts?: unknown }).posts)
      ? (data as { posts: unknown[] }).posts
      : [data];

  const posts: FixturePost[] = [];
  for (const item of list.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) continue;
    const handleRaw =
      typeof record.account === "string"
        ? record.account
        : typeof record.handle === "string"
          ? record.handle
          : "pasted";
    const account = handleRaw.replace(/^@/, "").toLowerCase() || "pasted";
    const action = record.action === "quote" || record.action === "reply" ? record.action : "post";
    const postedAt =
      typeof record.postedAt === "string" && !Number.isNaN(Date.parse(record.postedAt))
        ? new Date(record.postedAt).toISOString()
        : new Date(Date.parse(stamp) + posts.length * 60_000).toISOString();
    const accountCreatedAt = readCreated(record);
    const ageDays = readAgeDays(record.ageDays);
    if (record.ageDays !== undefined && record.ageDays !== null && record.ageDays !== "" && ageDays === undefined) {
      warnings.push(`ageDays for @${account} was not a whole number of days and was ignored.`);
    }
    if (accountCreatedAt && parseCreatedAt(accountCreatedAt) === null) {
      warnings.push(`Created date for @${account} did not parse. Age stays unknown unless ageDays was set.`);
    }
    posts.push({
      id: `paste-${posts.length + 1}`,
      account,
      text,
      postedAt,
      narrativeId: null,
      action: action as PostAction,
      ...(accountCreatedAt ? { accountCreatedAt } : {}),
      ...(ageDays !== undefined ? { ageDays } : {}),
    });
  }
  if (list.length > 20) warnings.push("Only the first 20 JSON posts were scored.");
  if (posts.length === 0) warnings.push("JSON did not include any posts with text.");
  return { posts, warnings };
}

function readCreated(record: Record<string, unknown>): string | undefined {
  for (const key of ["accountCreatedAt", "createdAt", "joined"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readAgeDays(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.floor(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return undefined;
}

function warnOnUnparsedAges(posts: FixturePost[], warnings: string[]) {
  for (const post of posts) {
    if (post.accountCreatedAt && parseCreatedAt(post.accountCreatedAt) === null && post.ageDays === undefined) {
      const line = `Created date for @${post.account} did not parse. Age left unknown.`;
      if (!warnings.includes(line)) warnings.push(line);
    }
  }
}

export type PasteRun = {
  warnings: string[];
  findings: AnnotatedPost[];
  accounts: AccountReport[];
  report: Report;
};

export function runPaste(raw: string): PasteRun {
  const corpus = corpusJson as Corpus;
  const parsed = parsePaste(raw);
  if (parsed.posts.length === 0) {
    return {
      warnings: parsed.warnings,
      findings: [],
      accounts: [],
      report: analyzeCorpus(corpus),
    };
  }
  const report = analyzeCorpus({
    ...corpus,
    posts: [...corpus.posts, ...parsed.posts],
  });
  const ids = new Set(parsed.posts.map((post) => post.id));
  const findings = report.posts.filter((post) => ids.has(post.id));
  const handles = new Set(findings.map((post) => post.account));
  const accounts = report.accounts.filter((account) => handles.has(account.handle));
  const directory = new Set(corpus.accounts.map((account) => account.handle));
  const ignoredAges = new Set<string>();
  for (const post of parsed.posts) {
    if (!directory.has(post.account)) continue;
    if (post.accountCreatedAt || post.ageDays !== undefined) ignoredAges.add(post.account);
  }
  const warnings = [...parsed.warnings];
  for (const handle of ignoredAges) {
    warnings.push(`@${handle} keeps the fixture created date. The pasted age was ignored.`);
  }
  return { warnings, findings, accounts, report };
}

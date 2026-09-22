import corpusJson from "@/data/corpus.json";
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
const HANDLE_PREFIX = /^@([A-Za-z0-9_]{1,15})\s*:\s*([\s\S]*)$/;

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
  const handled = chunks.filter((chunk) => HANDLE_LINE.test(chunk.split("\n")[0]?.trim() ?? ""));
  if (chunks.length > 1 && handled.length === chunks.length) return chunks;
  return [raw.trim()];
}

function toPost(block: string, index: number, stamp: string): FixturePost {
  const lines = block.split("\n");
  const first = lines[0]?.trim() ?? "";
  let account = "pasted";
  let text = block.trim();
  const handleLine = first.match(HANDLE_LINE);
  if (handleLine && lines.length > 1) {
    account = handleLine[1].toLowerCase();
    text = lines.slice(1).join("\n").trim();
  } else {
    const prefixed = text.match(HANDLE_PREFIX);
    if (prefixed) {
      account = prefixed[1].toLowerCase();
      text = prefixed[2].trim();
    }
  }
  return {
    id: `paste-${index + 1}`,
    account,
    text,
    postedAt: new Date(Date.parse(stamp) + index * 60_000).toISOString(),
    narrativeId: null,
    action: "post",
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
    posts.push({
      id: `paste-${posts.length + 1}`,
      account,
      text,
      postedAt,
      narrativeId: null,
      action: action as PostAction,
    });
  }
  if (list.length > 20) warnings.push("Only the first 20 JSON posts were scored.");
  if (posts.length === 0) warnings.push("JSON did not include any posts with text.");
  return { posts, warnings };
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
  return { warnings: parsed.warnings, findings, accounts, report };
}

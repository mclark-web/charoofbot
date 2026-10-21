// Build data/corpus.json from the checked-in CSVs in data/gcbot/. No dependencies.
// The CSVs are the source of truth: one row per account, one row per post, keyed by
// handle and post_id. Append rows, then run `npm run corpus`.
import { readFileSync, writeFileSync } from "node:fs";
import { assertPosts } from "./check-posts.mjs";

const dir = new URL("../data/gcbot/", import.meta.url);
const out = new URL("../data/corpus.json", import.meta.url);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.map((cells) => Object.fromEntries(header.map((key, i) => [key, cells[i] ?? ""])));
}

const read = (name) => parseCsv(readFileSync(new URL(name, dir), "utf8"));

const STRICT_ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;

function assertStrictIso(value, label) {
  if (typeof value !== "string" || !STRICT_ISO.test(value)) {
    throw new Error(`${label} must be strict ISO-8601 UTC (YYYY-MM-DDTHH:mm:ss.sssZ), got ${JSON.stringify(value)}`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${label} is not a real UTC timestamp: ${value}`);
  }
}

function unique(rows, key, file) {
  const seen = new Set();
  for (const row of rows) {
    if (!row[key]) throw new Error(`${file}: a row has no ${key}`);
    if (seen.has(row[key])) throw new Error(`${file}: ${key} ${row[key]} is listed twice`);
    seen.add(row[key]);
  }
  return seen;
}

export function buildCorpus() {
  const narrativeRows = read("narratives.csv");
  const accountRows = read("accounts.csv");
  const postRows = read("posts.csv");
  const reposterRows = read("reposters.csv");
  return corpusFrom(narrativeRows, accountRows, postRows, reposterRows);
}

function corpusFrom(narrativeRows, accountRows, postRows, reposterRows) {
  const narrativeIds = unique(narrativeRows, "narrative_id", "narratives.csv");
  const handles = unique(accountRows, "handle", "accounts.csv");
  unique(postRows, "post_id", "posts.csv");

function compareText(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

const actions = new Set(["post", "quote", "reply", "repost"]);
const postById = new Map(postRows.map((row) => [row.post_id, row]));
const sameText = new Map();
for (const row of postRows) {
  const key = row.text.trim();
  const list = sameText.get(key);
  if (list) list.push(row);
  else sameText.set(key, [row]);
}
for (const list of sameText.values()) {
  list.sort((a, b) => compareText(a.created_at, b.created_at) || compareText(a.post_id, b.post_id));
}
for (const row of postRows) {
  if (!handles.has(row.handle)) throw new Error(`posts.csv: @${row.handle} (post ${row.post_id}) is not in accounts.csv`);
  assertStrictIso(row.created_at, `posts.csv: post ${row.post_id} created_at`);
  if (!actions.has(row.action)) throw new Error(`posts.csv: post ${row.post_id} has action "${row.action}"`);
  const retweet = row.text.trimStart().startsWith("RT @");
  if (retweet && row.action !== "repost") {
    throw new Error(`posts.csv: post ${row.post_id} starts with "RT @" and must use action repost`);
  }
  if (row.action === "repost" && !retweet) {
    throw new Error(`posts.csv: post ${row.post_id} has action repost but the text does not start with "RT @"`);
  }
  if (row.narrative_id && !narrativeIds.has(row.narrative_id)) throw new Error(`posts.csv: post ${row.post_id} names unknown narrative ${row.narrative_id}`);
  assertRef(row, postById, sameText);
}

const corpus = {
  narratives: narrativeRows.map((row) => ({
    id: row.narrative_id,
    title: row.title,
    shortLabel: row.short_label,
    topic: row.topic,
    summary: row.summary,
    framePhrases: row.frame_phrases ? row.frame_phrases.split("|").map((s) => s.trim()).filter(Boolean) : [],
  })),
  accounts: accountRows.map((row) => {
    assertStrictIso(row.account_created_at, `accounts.csv: @${row.handle} account_created_at`);
    return {
    handle: row.handle,
    name: row.name,
    bio: row.bio,
    joined: row.account_created_at.slice(0, 10),
    accountCreatedAt: row.account_created_at.slice(0, 10),
    followers: Number(row.followers) || 0,
    following: Number(row.following) || 0,
    follows: [],
    trackedBoard: row.tracked_board || null,
  };
  }),
  posts: [...postRows]
    .sort((a, b) => compareText(a.created_at, b.created_at) || compareText(a.post_id, b.post_id))
    .map((row) => ({
      id: row.post_id,
      account: row.handle,
      text: row.text,
      postedAt: new Date(row.created_at).toISOString(),
      narrativeId: row.narrative_id || null,
      action: row.action,
      url: row.url,
      refPostId: row.ref_post_id || null,
      source: row.source || null,
      // Only a row marked truncated is cut off. unknown means not yet checked.
      textTruncated: effectivelyTruncated(row),
    })),
    reposters: reposterRows.map((row) => {
      if (!row.handle) throw new Error("reposters.csv: a row has no handle");
      if (!row.reposted_post_id) throw new Error(`reposters.csv: @${row.handle} has no reposted_post_id`);
      if (row.narrative_id && !narrativeIds.has(row.narrative_id)) {
        throw new Error(`reposters.csv: @${row.handle} names unknown narrative ${row.narrative_id}`);
      }
      assertStrictIso(row.account_created_at, `reposters.csv: @${row.handle} account_created_at`);
      return {
        repostedPostId: row.reposted_post_id,
        narrativeId: row.narrative_id,
        handle: row.handle,
        accountCreatedAt: row.account_created_at,
        followers: Number(row.followers) || 0,
        following: Number(row.following) || 0,
      };
    }),
  };
  const seenReposts = new Set();
  for (const row of corpus.reposters) {
    const key = `${row.repostedPostId}\t${row.handle.toLowerCase()}`;
    if (seenReposts.has(key)) {
      throw new Error(`reposters.csv: @${row.handle} is listed twice for post ${row.repostedPostId}`);
    }
    seenReposts.add(key);
  }
  return corpus;
}

function effectivelyTruncated(row) {
  return row.full_text === "truncated" || row.text_truncated === "true";
}

// Same clock time breaks by snowflake id. 2111201312607981974 quotes
// 2111201310351495320 in the same second; the smaller id was issued first.
function isStrictlyEarlier(target, row) {
  if (target.created_at < row.created_at) return true;
  if (target.created_at > row.created_at) return false;
  return BigInt(target.post_id) < BigInt(row.post_id);
}

function assertRef(row, postById, sameText) {
  const flag = row.ref_in_corpus;
  if (flag !== "true" && flag !== "false") {
    throw new Error(
      `posts.csv: post ${row.post_id} ref_in_corpus must be true or false, got ${JSON.stringify(flag)}`,
    );
  }
  const ref = row.ref_post_id;
  const target = ref ? postById.get(ref) : undefined;
  if (flag === "false") {
    if (target) {
      throw new Error(
        `posts.csv: post ${row.post_id} ref_post_id ${ref} is in posts.csv, so ref_in_corpus must be true`,
      );
    }
    return;
  }
  if (!target) {
    throw new Error(
      `posts.csv: post ${row.post_id} ref_in_corpus is true but ref_post_id ${JSON.stringify(ref || "")} is not in posts.csv`,
    );
  }
  if (!isStrictlyEarlier(target, row)) {
    throw new Error(
      `posts.csv: post ${row.post_id} ref_post_id ${ref} is not strictly earlier (${target.created_at} ${target.post_id} vs ${row.created_at} ${row.post_id}). Clear the ref if it is not an earlier source.`,
    );
  }
  const earliest = sameText.get(target.text.trim())[0];
  if (earliest.post_id !== target.post_id) {
    throw new Error(
      `posts.csv: post ${row.post_id} ref_post_id ${ref} is not the earliest match (earliest is ${earliest.post_id})`,
    );
  }
}

if (process.argv[1]?.endsWith("build-corpus.mjs")) {
  assertPosts();
  const corpus = buildCorpus();
  writeFileSync(out, `${JSON.stringify(corpus, null, 2)}\n`);
  console.log(`corpus.json: ${corpus.narratives.length} narratives, ${corpus.accounts.length} accounts, ${corpus.posts.length} posts, ${corpus.reposters.length} reposters`);
}

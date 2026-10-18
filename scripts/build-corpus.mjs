// Build data/corpus.json from the checked-in CSVs in data/gcbot/. No dependencies.
// The CSVs are the source of truth: one row per account, one row per post, keyed by
// handle and post_id. Append rows, then run `npm run corpus`.
import { readFileSync, writeFileSync } from "node:fs";

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

function unique(rows, key, file) {
  const seen = new Set();
  for (const row of rows) {
    if (!row[key]) throw new Error(`${file}: a row has no ${key}`);
    if (seen.has(row[key])) throw new Error(`${file}: ${key} ${row[key]} is listed twice`);
    seen.add(row[key]);
  }
  return seen;
}

const narrativeRows = read("narratives.csv");
const accountRows = read("accounts.csv");
const postRows = read("posts.csv");
const narrativeIds = unique(narrativeRows, "narrative_id", "narratives.csv");
const handles = unique(accountRows, "handle", "accounts.csv");
unique(postRows, "post_id", "posts.csv");

const actions = new Set(["post", "quote", "reply", "repost"]);
const postById = new Map(postRows.map((row) => [row.post_id, row]));
for (const row of postRows) {
  if (!handles.has(row.handle)) throw new Error(`posts.csv: @${row.handle} (post ${row.post_id}) is not in accounts.csv`);
  if (!actions.has(row.action)) throw new Error(`posts.csv: post ${row.post_id} has action "${row.action}"`);
  const retweet = row.text.trimStart().startsWith("RT @");
  if (retweet && row.action !== "repost") {
    throw new Error(`posts.csv: post ${row.post_id} starts with "RT @" and must use action repost`);
  }
  if (row.action === "repost" && !retweet) {
    throw new Error(`posts.csv: post ${row.post_id} has action repost but the text does not start with "RT @"`);
  }
  if (Number.isNaN(Date.parse(row.created_at))) throw new Error(`posts.csv: post ${row.post_id} has no valid created_at`);
  if (row.narrative_id && !narrativeIds.has(row.narrative_id)) throw new Error(`posts.csv: post ${row.post_id} names unknown narrative ${row.narrative_id}`);
  if (row.ref_post_id && postById.has(row.ref_post_id)) {
    const target = postById.get(row.ref_post_id);
    if (target.created_at > row.created_at) {
      throw new Error(
        `posts.csv: post ${row.post_id} ref_post_id ${row.ref_post_id} points at a later post (${target.created_at} is after ${row.created_at})`,
      );
    }
  }
}

function compareText(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
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
  accounts: accountRows.map((row) => ({
    handle: row.handle,
    name: row.name,
    bio: row.bio,
    joined: row.account_created_at.slice(0, 10),
    accountCreatedAt: row.account_created_at.slice(0, 10),
    followers: Number(row.followers) || 0,
    following: Number(row.following) || 0,
    follows: [],
    trackedBoard: row.tracked_board || null,
  })),
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
      textTruncated: row.text_truncated === "true",
    })),
};

writeFileSync(out, `${JSON.stringify(corpus, null, 2)}\n`);
console.log(`corpus.json: ${corpus.narratives.length} narratives, ${corpus.accounts.length} accounts, ${corpus.posts.length} posts`);

// X's short `text` is capped at 280 characters and, when cut, ends in "…".
// A bare trailing t.co in that same band is the other truncated-preview shape.
// Longer notes often end in a real source link, so they stay out of this warning.
const SHORT_TEXT_MIN = 280;
const SHORT_TEXT_MAX = 330;
const BARE_TCO = /https:\/\/t\.co\/[A-Za-z0-9]+$/;
const warnings = [];
for (const row of postRows) {
  if (row.action === "repost" || row.text.trimStart().startsWith("RT @")) continue;
  const trimmed = row.text.trimEnd();
  const chars = [...trimmed].length;
  let reason = null;
  if (trimmed.endsWith("…")) reason = "ends with …";
  else if (BARE_TCO.test(trimmed) && chars >= SHORT_TEXT_MIN && chars <= SHORT_TEXT_MAX) {
    reason = "bare t.co link at the 280-character length limit";
  }
  if (reason) warnings.push(`posts.csv: ${row.post_id} @${row.handle} ${reason} (${chars} chars)`);
}
for (const line of warnings) console.warn(`warning: ${line}`);
if (warnings.length) console.warn(`warning: ${warnings.length} stored text(s) look truncated. Texts were not changed.`);

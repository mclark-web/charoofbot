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

const actions = new Set(["post", "quote", "reply"]);
for (const row of postRows) {
  if (!handles.has(row.handle)) throw new Error(`posts.csv: @${row.handle} (post ${row.post_id}) is not in accounts.csv`);
  if (!actions.has(row.action)) throw new Error(`posts.csv: post ${row.post_id} has action "${row.action}"`);
  if (Number.isNaN(Date.parse(row.created_at))) throw new Error(`posts.csv: post ${row.post_id} has no valid created_at`);
  if (row.narrative_id && !narrativeIds.has(row.narrative_id)) throw new Error(`posts.csv: post ${row.post_id} names unknown narrative ${row.narrative_id}`);
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
  })),
  posts: [...postRows]
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.post_id.localeCompare(b.post_id))
    .map((row) => ({
      id: row.post_id,
      account: row.handle,
      text: row.text,
      postedAt: new Date(row.created_at).toISOString(),
      narrativeId: row.narrative_id || null,
      action: row.action,
      url: row.url,
    })),
};

writeFileSync(out, `${JSON.stringify(corpus, null, 2)}\n`);
console.log(`corpus.json: ${corpus.narratives.length} narratives, ${corpus.accounts.length} accounts, ${corpus.posts.length} posts`);

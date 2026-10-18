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
    if (target.created_at > row.created_at || (target.created_at === row.created_at && target.post_id > row.post_id)) {
      throw new Error(
        `posts.csv: post ${row.post_id} ref_post_id ${row.ref_post_id} points at a later post (${target.created_at} is after ${row.created_at})`,
      );
    }
    const earliest = sameText.get(target.text.trim())[0];
    if (earliest.post_id !== target.post_id) {
      throw new Error(
        `posts.csv: post ${row.post_id} ref_post_id ${row.ref_post_id} is not the earliest match (earliest is ${earliest.post_id})`,
      );
    }
  }
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

// X's short `text` is capped near 280 characters. A cut note ends in "…", in a bare
// t.co around that cap, mid-word with no punctuation and no link, or as a short
// body whose parallel post put a t.co where the rest of the note should be.
// Texts are not rewritten here. Data Review cleared 24 of the old warnings; those
// ids stay unmarked and are not failures.
const CLEARED_TRUNCATION = new Set([
  "2107096957743436264",
  "2107506142754812150",
  "2107562768387686860",
  "2109254276010607001",
  "2110354802710311125",
  "2110536341851418802",
  "2110910568869646811",
  "2111161249824440477",
  "2111193148114587675",
  "2111201312607981974",
  "2111240848205885863",
  "2111455269960208607",
  "2111619890100457474",
  "2111659778309312543",
  "2111728711569469743",
  "2111737799393300493",
  "2111793164516282481",
  "2111809567017296278",
  "2111823540039127364",
  "2111826464978903313",
  "2111849653998338478",
  "2111901966339072251",
  "2111915606396051736",
  "2111917886793204104",
]);
const BARE_TCO = /https:\/\/t\.co\/[A-Za-z0-9]+$/;
const DANGLING = /^(by|the|a|an|of|to|and|or|in|for|with|at|as|on|from|into|than|that|will)$/i;

function truncationReason(row) {
  if (row.action === "repost" || row.text.trimStart().startsWith("RT @")) return null;
  const trimmed = row.text.trimEnd();
  const chars = [...trimmed].length;
  if (trimmed.endsWith("…")) return `ends with … (${chars} chars)`;
  if (BARE_TCO.test(trimmed) && chars >= 280 && chars <= 330) {
    return `bare t.co link at the 280-character length limit (${chars} chars)`;
  }
  const endsSentence = /[.!?…]["”’']?$/.test(trimmed);
  const hasUrl = /https?:\/\//.test(trimmed);
  if (chars >= 270 && chars <= 285 && !endsSentence && !hasUrl) {
    const last = trimmed.match(/[A-Za-z’']+$/);
    if (last && DANGLING.test(last[0])) return `ends mid-sentence near 280 characters with no link (${chars} chars)`;
  }
  // A sibling kept the same opening and then a t.co. This row kept writing and
  // still stopped short of 280 with no link, so the link replaced the rest.
  if (chars >= 220 && chars < 280 && !hasUrl) {
    const head = trimmed.slice(0, 80);
    const sibling = postRows.find((other) => {
      if (other.post_id === row.post_id) return false;
      if (other.action === "repost" || other.text.trimStart().startsWith("RT @")) return false;
      if (!other.text.startsWith(head)) return false;
      return /https:\/\/t\.co\//.test(other.text.slice(80, 160)) && [...other.text].length < chars;
    });
    if (sibling) return `t.co link replaced trailing content (${chars} chars)`;
  }
  return null;
}

const truncationFailures = [];
for (const row of postRows) {
  if (CLEARED_TRUNCATION.has(row.post_id)) continue;
  const reason = truncationReason(row);
  if (!reason || row.text_truncated === "true") continue;
  truncationFailures.push(`posts.csv: ${row.post_id} @${row.handle} ${reason}`);
}
if (truncationFailures.length) {
  throw new Error(
    `${truncationFailures.length} stored text(s) look truncated and are not marked text_truncated=true. Texts were not changed.\n${truncationFailures.join("\n")}`,
  );
}

writeFileSync(out, `${JSON.stringify(corpus, null, 2)}\n`);
console.log(`corpus.json: ${corpus.narratives.length} narratives, ${corpus.accounts.length} accounts, ${corpus.posts.length} posts`);

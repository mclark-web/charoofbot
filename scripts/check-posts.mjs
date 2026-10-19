// Fails the build when posts.csv breaks the truncation invariants.
// full_text is verified, truncated, or unknown. Known cuts are truncated.
// Confirmed-short rows are verified. Everything else is unknown.
// Texts are not rewritten here.
import { readFileSync } from "node:fs";

const POSTS = new URL("../data/gcbot/posts.csv", import.meta.url);

/** Rows Data Review already confirmed are cut off. Plus Rob__Paul's unmarked note. */
export const KNOWN_TRUNCATED = [
  "2110431151793848340",
  "2110533595467059605",
  "2110622475071463463",
  "2110642706955341945",
  "2110785947881054395",
  "2110788644302733574",
  "2110788648123638132",
  "2110788651789475964",
  "2110788655732121691",
  "2110788666297557208",
  "2110792112937586940",
  "2110847813626348003",
  "2110923292747940044",
  "2111101504547422685",
  "2111140313666379856",
  "2111147042244366607",
  "2111150370613346526",
  "2111168823520895216",
  "2111191790552248409",
  "2111201310351495320",
  "2111224854695346474",
  "2111539115036422399",
  "2111660366987985324",
  "2111790305615769779",
  "2111804753545986049",
  "2111831773831192979",
  "2111846319937536357",
  "2111846805637910778",
  "2111861235994259936",
  "2111892097200464335",
];

/** Rows a reviewer confirmed are complete. Unknown is not a truncation guess. */
export const CONFIRMED_SHORT = [
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
  "2107982307348934917",
  "2111548049214603437",
  "2111593347848511863",
  "2111644659131068840",
  "2111889643503259923",
];

const FULL_TEXT = new Set(["verified", "truncated", "unknown"]);

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((cells) => Object.fromEntries(header.map((key, i) => [key, cells[i] ?? ""])));
}

export function assertPosts(text = readFileSync(POSTS, "utf8")) {
  const rows = parseCsv(text);
  const failures = [];
  const seen = new Set();
  const known = new Set(KNOWN_TRUNCATED);
  const confirmed = new Set(CONFIRMED_SHORT);
  if (known.size !== KNOWN_TRUNCATED.length) failures.push("KNOWN_TRUNCATED lists a post twice");
  if (confirmed.size !== CONFIRMED_SHORT.length) failures.push("CONFIRMED_SHORT lists a post twice");
  for (const id of known) {
    if (confirmed.has(id)) failures.push(`${id} is both a known cut and confirmed short`);
  }

  for (const row of rows) {
    if (!row.post_id) {
      failures.push("a row has no post_id");
      continue;
    }
    if (seen.has(row.post_id)) failures.push(`${row.post_id} is listed twice`);
    seen.add(row.post_id);
    const full = row.full_text ?? "";
    if (!FULL_TEXT.has(full)) {
      failures.push(`${row.post_id} full_text must be verified, truncated, or unknown (got ${JSON.stringify(full)})`);
      continue;
    }
    const flagged = row.text_truncated === "true";
    if ((full === "truncated") !== flagged) {
      failures.push(`${row.post_id} full_text=${full} but text_truncated=${row.text_truncated}`);
    }
    if (known.has(row.post_id) && full !== "truncated") {
      failures.push(`${row.post_id} is a known cut and must be full_text=truncated`);
    }
    if (confirmed.has(row.post_id) && full !== "verified") {
      failures.push(`${row.post_id} is confirmed short and must be full_text=verified`);
    }
    if (!known.has(row.post_id) && !confirmed.has(row.post_id) && full !== "unknown") {
      failures.push(`${row.post_id} is neither a known cut nor confirmed short, so full_text must be unknown`);
    }
  }
  for (const id of known) {
    if (!seen.has(id)) failures.push(`known cut ${id} is missing from posts.csv`);
  }
  for (const id of confirmed) {
    if (!seen.has(id)) failures.push(`confirmed short ${id} is missing from posts.csv`);
  }
  if (failures.length) {
    throw new Error(`${failures.length} posts.csv truncation invariant(s) failed.\n${failures.join("\n")}`);
  }
  return rows;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href || process.argv[1]?.endsWith("check-posts.mjs")) {
  assertPosts();
}

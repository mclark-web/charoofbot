// Fails the build when posts.csv breaks the truncation invariants.
// full_text is verified, truncated, or unknown, and text_truncated agrees.
// Known cuts and note_tweet cuts are truncated. Checked rows are verified.
// A note_tweet whose stored text matches the note after normalization is verified.
// unknown is only a repost or a post under 250 characters.
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

/** note_tweet was present and the stored text is still shorter than the note. */
export const NOTE_TRUNCATED = [
  "2111092645237854530",
  "2111147917566267609",
  "2111197415071965242",
  "2111411410517234076",
  "2111457453082657046",
  "2111502751075283291",
  "2111517850334896217",
  "2111558052956549622",
  "2111563148834853345",
  "2111566107303936213",
  "2111667586521821370",
  "2111858369476915271",
  "2111898430389817832",
];

/**
 * note_tweet was present, but the stored text matches note_tweet.text after
 * normalization, so the row is complete.
 */
export const NOTE_TEXT_COMPLETE = [
  "2107306997955862598",
  "2107395357952905438",
  "2107478547849716017",
  "2107905937126097147",
  "2107910297252196397",
  "2108161441199013940",
  "2108207479393755377",
  "2110410304064786626",
  "2110708517548007600",
  "2110813853428728290",
  "2110885652900294951",
  "2111129418554888611",
  "2111130123390882046",
  "2111137596294266984",
  "2111156887798378990",
  "2111170586672033929",
  "2111207114303742232",
  "2111354877477826768",
  "2111417610130649225",
  "2111431033321136213",
  "2111448026082398410",
  "2111470144039838071",
  "2111477042562715756",
  "2111577365222711649",
  "2111609670330986649",
  "2111694737996472734",
  "2111701641611407443",
  "2111754789059006904",
  "2111774642285547562",
  "2111776717840994568",
  "2111799253920256160",
  "2111827499730571288",
  "2111834476422861048",
  "2111837779785040379",
  "2111842149419332042",
  "2111842489447669798",
  "2111842685439115378",
  "2111846319937536357",
  "2111850039483961757",
  "2111867016445677955",
  "2111886141913714960",
  "2111891858766823506",
  "2111893175686381800",
  "2111895337493217774",
  "2111895453746991458",
  "2111914538337751292",
  "2111917415273775610",
];

/** note_tweet was absent, so the stored text is complete. */
export const NOTE_VERIFIED = [
  "2107096953486299505",
  "2107220628051030381",
  "2107469655543881966",
  "2108243065542733964",
  "2108653525911716097",
  "2108910755315859907",
  "2108911611926790465",
  "2108912549403951340",
  "2108913709364207934",
  "2109652381268951198",
  "2110372951354962371",
  "2110554230985740780",
  "2110585625380303213",
  "2110691652465725865",
  "2110730562000630185",
  "2110737401631105285",
  "2110756191077019822",
  "2110788641681215954",
  "2110839336115790312",
  "2110840242760548651",
  "2110862183252820328",
  "2111008518606086386",
  "2111043778274345114",
  "2111079250618892326",
  "2111086421968900188",
  "2111086429552218227",
  "2111086579880227277",
  "2111115305976029301",
  "2111122060642586808",
  "2111145499999011327",
  "2111168195348549649",
  "2111175846438355372",
  "2111177884022743162",
  "2111200583289819408",
  "2111201248196366609",
  "2111211324092940690",
  "2111222579692273689",
  "2111377928152059958",
  "2111406137777995970",
  "2111435221807563080",
  "2111435550955917474",
  "2111450060835958892",
  "2111454874177015961",
  "2111455517331841065",
  "2111531065022304680",
  "2111640096998883548",
  "2111768539182837810",
  "2111771120869179776",
  "2111792053151547813",
  "2111794578328367278",
  "2111797364155670763",
  "2111801079834812876",
  "2111818903647068576",
  "2111834864060100926",
  "2111846707839561967",
  "2111851269472358737",
  "2111863702844534938",
  "2111871056567054530",
  "2111871967846400171",
  "2111872688222597122",
  "2111873596712685733",
  "2111885558465413304",
  "2111890078922375229",
  "2111892570234327115",
  "2111898351960838254",
  "2111902423325217002",
];

/** The note_tweet text is stored in full, so this cut row is verified. */
export const FULL_NOTE_VERIFIED = "2111865138747752678";

const FULL_TEXT = new Set(["verified", "truncated", "unknown"]);
const UNKNOWN_MAX_CHARS = 250;

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
  const known = new Set([...KNOWN_TRUNCATED, ...NOTE_TRUNCATED]);
  const confirmed = new Set([...CONFIRMED_SHORT, ...NOTE_VERIFIED, ...NOTE_TEXT_COMPLETE, FULL_NOTE_VERIFIED]);
  if (known.size !== KNOWN_TRUNCATED.length + NOTE_TRUNCATED.length) failures.push("truncated id lists overlap or repeat");
  if (confirmed.size !== CONFIRMED_SHORT.length + NOTE_VERIFIED.length + NOTE_TEXT_COMPLETE.length + 1) {
    failures.push("verified id lists overlap or repeat");
  }
  for (const id of known) {
    if (confirmed.has(id)) failures.push(`${id} is both truncated and verified`);
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
      failures.push(`${row.post_id} is confirmed complete and must be full_text=verified`);
    }
    const repost = row.action === "repost" || row.text.trimStart().startsWith("RT @");
    const chars = [...row.text.trimEnd()].length;
    if (full === "unknown" && !repost && chars >= UNKNOWN_MAX_CHARS) {
      failures.push(`${row.post_id} is unknown, not a repost, and ${chars} characters`);
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

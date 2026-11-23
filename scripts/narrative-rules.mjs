// Current text rules for the phrase narratives. The corpus build applies these
// to every row so both weeks of a card use one tagger. posts.csv is not rewritten.
// Theme patterns run before the phrase list, matching scripts/load-nov15-corpus.py.

const URL_RE = /https?:\/\/\S+/g;

const KEYWORD = {
  uap: /ufo|\buaps?\b|extraterrestrial|area\s*51|\bnhi\b|flying saucer|unidentified (?:aerial|anomalous)|aliens?\s+exist|(?:ufo|uap|alien).{0,80}disclosure|disclosure.{0,80}(?:ufo|uap|alien)/i,
  iran: /\biran\b|iranian|tehran|khamenei|\birgc\b/i,
  "fed-rates": /\bfed\b|federal reserve|\bfomc\b|\bpowell\b|rate cut|interest rate|\binflation\b|\bcpi\b|\bppi\b|producer price|basis point/i,
  affordability: /afford|cost of living|cost-of-living|grocery|\bhousing\b|\brenter\b|\brent\b/i,
  "us-elections": /election|midterm|ballot|\bvot(?:e|es|ed|ing|er|ers)\b|\bsenator\b|\bcampaign\b|\bimpeach/i,
  immigration: /immigr|deport|\bice\b|\bborder\b|illegal alien|asylum|migrant|undocumented|non-?citizen|homeland security|\bdhs\b|\bvisa\b|sanctuary|\baliens?\b/i,
  "europe-protests": /protest|\briots?\b|\brioters?\b|unrest|demonstrat|hit the streets|take to the streets|\bmacron\b|france is burning|\bburning\b/i,
};

const IMMIGRATION_RE = /immigr|deport|illegal alien|\basylum\b|\bmigrants?\b|undocumented|homeland security|\bdhs\b|sanctuary|\bborder (?:patrol|wall|crisis|security)/i;
const ICE_RE = /\bICE\b/;
const ELECTIONS_RE = /\bmidterms?\b|\bballots?\b|\belections?\b|\bimpeach|\bsenator\b/i;
const UAP_RE = /\bufo\b|\buaps?\b|extraterrestrial|area\s*51|\bnhi\b|flying saucer|unidentified (?:aerial|anomalous)/i;
const AFFORDABILITY_RE = /afford|cost of living|cost-of-living|grocery|\bhousing\b|\brenter\b|\brent\b/i;
const FED_RATES_RE = /\bfed\b|federal reserve|\bfomc\b|\bpowell\b|rate cut|interest rate|\binflation\b|\bcpi\b|\bppi\b|producer price|basis point/i;
const IRAN_WORD_RE = /\biran\b|iranian|tehran|khamenei|\birgc\b/i;
const PROTEST_RE = /protest|\briots?\b|\brioters?\b|unrest|demonstrat/i;
const EUROPE_PLACE_RE = /frankfurt|\bparis\b|\bgermany\b|\bfrance\b|\bmacron\b|\bspain\b|\bitaly\b|\bgreece\b|\blondon\b|\buk\b/i;
const HOUTHI_RE = /\bhouthi|\byemen\b|red sea/i;
const NVIDIA_RE = /jensen huang|stand with jensen|#standwithjensen|bringjensenback|bring jensen back|reinstate jensen|(?:nvidia|\bnvda\b).{0,60}(?:succession|chief executive)|bessent.{0,40}nvidia|nvidia.{0,40}bessent|(?:chip probe|probed).{0,40}(?:nvidia|\bnvda\b)|(?:nvidia|\bnvda\b).{0,40}(?:chip probe|illegally sold)/i;
const GROUND_RE = /ground stop|l3harris/i;
const FED_RE = /federal reserve|fed chair|\bfomc\b|\bwarsh\b/i;
const TESLA_RE = /tesla.{0,40}spacex|spacex.{0,40}tesla|starship flight/i;
const AI_RE = /\banthropic\b|\bopenai\b|ai bubble|softbank.{0,30}turbine/i;
const IRAN_RE = /\bhormuz\b|\birgc\b|khamenei|\btehran\b|\bqeshm\b|persian gulf|bandar abbas|\biran\b.{0,80}(?:strike|tanker|missile|drone|mine|hormuz|gulf|war)/i;
const BTC_RE = /\bbitcoin\b|\$BTC\b|\bBTC\b|\bbinance\b/i;
const CUBA_RE = /\bd[ií]az-canel\b|military readiness|\bcuba\b.{0,80}(?:attack|strike|invasion|defend|war|braces)|(?:attack|strike|invasion|war).{0,80}\bcuba\b/i;

// The contest itself is another country's. A US senator mentioning Israel still matches.
const FOREIGN_ELECTION_RE = new RegExp(
  [
    "knesset",
    "israel(?:i|’s|'s)? elections?",
    "elections? in israel",
    "\\bhaiti\\b",
    "jovenel",
    "\\bmoise\\b",
    "\\ble pen\\b",
    "france(?:’s|'s)?.{0,160}elections?",
    "elections?.{0,120}france",
    "french elections?",
    "spain(?:’s|'s)?.{0,160}elections?",
    "elections?.{0,80}spain",
    "ayuso",
    "sánchez",
    "brazil(?:’s|'s)?.{0,120}(?:ballot|elections?|runoff|vot)",
    "bolsonaro",
    "india(?:’s|'s)?.{0,160}elections?",
    "elections?.{0,80}india",
    "new delhi.{0,80}election",
    "netherlands.{0,120}elections?",
    "elections?.{0,80}netherlands",
    "\\bjetten\\b",
    "election in britain",
    "next election in britain",
    "wetherspoon",
    "\\bburnham\\b",
  ].join("|"),
  "iu",
);
const US_ELECTION_ANCHOR_RE = /\bmidterms?\b|\bimpeach|\bcongress\b|\bwhite house\b|\bgop\b|\bdemocrats?\b|\brepublicans?\b|\belectoral college\b|\bus senator\b|\bu\.s\. senator\b/i;

export function keywordText(text) {
  return text.replace(URL_RE, " ");
}

/** True when the election words describe another country's contest. */
export function isNonUsElection(text) {
  const plain = keywordText(text);
  if (!ELECTIONS_RE.test(plain)) return false;
  if (!FOREIGN_ELECTION_RE.test(plain)) return false;
  return !US_ELECTION_ANCHOR_RE.test(plain);
}

function phraseNarrative(raw, usElections = "tight") {
  const text = keywordText(raw);
  let candidate = "";
  if (PROTEST_RE.test(text) && EUROPE_PLACE_RE.test(text)) candidate = "europe-protests";
  else if (IMMIGRATION_RE.test(text) || ICE_RE.test(raw)) candidate = "immigration";
  else if (ELECTIONS_RE.test(text)) {
    // A foreign contest is not retagged as the next phrase that happens to match.
    if (!(usElections === "tight" && isNonUsElection(raw))) candidate = "us-elections";
  } else if (UAP_RE.test(text)) candidate = "uap";
  else if (AFFORDABILITY_RE.test(text)) candidate = "affordability";
  else if (FED_RATES_RE.test(text)) candidate = "fed-rates";
  else if (IRAN_WORD_RE.test(text)) candidate = "iran";
  if (candidate && KEYWORD[candidate].test(raw)) return candidate;
  return "";
}

/**
 * Theme patterns, then the phrase list. `usElections: "loose"` is the PR #16
 * rule before the foreign-election gate, used to count what that gate removes.
 */
export function keywordOf(raw, createdAt, options = {}) {
  const usElections = options.usElections ?? "tight";
  const day = createdAt.slice(0, 10);
  const text = keywordText(raw);
  if (PROTEST_RE.test(text) && EUROPE_PLACE_RE.test(text) && KEYWORD["europe-protests"].test(raw)) {
    return "europe-protests";
  }
  if (HOUTHI_RE.test(text)) return "houthis-red-sea";
  if (NVIDIA_RE.test(text)) return "nvidia-leadership";
  if (day >= "2026-11-12" && GROUND_RE.test(text)) return "ground-stop";
  if (day >= "2026-11-06" && FED_RE.test(text)) return "fed-week";
  if (TESLA_RE.test(text)) return "tesla-spacex";
  if (AI_RE.test(text)) return "ai-capex";
  if (IRAN_RE.test(text)) return "iran-gulf";
  if (BTC_RE.test(text)) return "btc";
  if (CUBA_RE.test(text)) return "cuba";
  return phraseNarrative(raw, usElections);
}

const PHRASE_IDS = new Set([
  "uap",
  "iran",
  "fed-rates",
  "affordability",
  "us-elections",
  "immigration",
  "europe-protests",
]);
const PHRASE_RETAG = new Set(["fed-rates", "us-elections"]);

/**
 * Phrase tag from the current rules. A stored fed-rates or us-elections tag
 * that those rules do not reproduce is cleared. A theme match can replace it.
 * Another phrase does not. Every other stored tag stays. posts.csv is not rewritten.
 */
export function derivedNarrative(row) {
  const kw = keywordOf(row.text, row.created_at);
  const stored = row.narrative_id;
  if (PHRASE_RETAG.has(kw)) return kw;
  if (PHRASE_RETAG.has(stored)) {
    if (kw && !PHRASE_IDS.has(kw)) return kw;
    return "";
  }
  return stored;
}

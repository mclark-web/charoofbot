#!/usr/bin/env python3
"""Append an X corpus onto data/gcbot without rewriting rows already there.

posts.csv and accounts.csv stay append-only. New rows keep the collector's X URL.
Theme searches become narrative ids so the board can name who started a wave and
who repeated it. A row already in the file is left untouched.

The 19 Nov 2026 refresh and the 22 Nov 2026 refresh use the same script.
Full-archive search was unavailable, so the upload is timelines of the tracked
accounts and the wires already on the board. A wire post with no narrative is
not appended. A tracked account's post keeps that account's lane when no theme
matches.
"""
import csv
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "gcbot"
POST_COLS = [
    "post_id", "handle", "created_at", "action", "text", "url", "narrative_id",
    "ref_post_id", "source", "fetched_at", "text_truncated", "full_text", "ref_in_corpus",
]
ACC_COLS = [
    "handle", "x_user_id", "name", "bio", "account_created_at", "followers", "following",
    "tracked_board", "tracked_name", "narrative_id", "source_url", "fetched_at",
]
NARR_COLS = ["narrative_id", "title", "short_label", "topic", "summary", "frame_phrases"]

NEW_NARRATIVES = [
    ("nvidia-leadership", "Nvidia leadership fight", "Nvidia", "Markets",
     "The fight over Jensen Huang's seat at Nvidia: succession talks, the Stand with Jensen petition, the China chip probe, and Bessent's 10-day clock.", ""),
    ("iran-gulf", "Iran and the Gulf", "Iran/Gulf", "Geopolitics",
     "The Iran war, the Strait of Hormuz, tanker mines, and strikes around the Gulf, with the accounts that repeated the same wording.", ""),
    ("houthis-red-sea", "Houthis and the Red Sea", "Houthis", "Geopolitics",
     "Houthi and Yemeni armed-forces strikes on Saudi Arabia and shipping, including Riyadh, Ras Tanura, and the Red Sea.", ""),
    ("fed-week", "Fed week", "Fed week", "Economy",
     "The October jobs report and the Federal Reserve speeches on the week-ahead calendar through 15 Nov 2026.", ""),
    ("btc", "Bitcoin selloff", "BTC", "Markets",
     "Bitcoin's drop, weekend liquidations, and the Binance hack posts that traveled with them.", ""),
    ("ai-capex", "AI spending wave", "AI capex", "Markets",
     "AI-bubble, Anthropic, OpenAI, and power-turbine posts, and the accounts copying them.", ""),
    ("ground-stop", "FAA ground stop", "Ground stop", "News",
     "The 13 Nov nationwide FAA ground stop, the L3Harris network failure, and the outages posted with it.", ""),
    ("tesla-spacex", "Tesla and SpaceX", "Tesla/SpaceX", "Markets",
     "Tesla–SpaceX merger talk and Starship flight posts, and the accounts copying them.", ""),
    ("cuba", "Cuba and the US", "Cuba", "Geopolitics",
     "Cuba's military readiness and US-tension posts from 14 Nov 2026.", ""),
]

THEME = {
    "nvda-ceo-succession": "nvidia-leadership",
    "standwithjensen-petition": "nvidia-leadership",
    "musk-reinstate-jensen": "nvidia-leadership",
    "huang-comeback": "nvidia-leadership",
    "nvda-huang-spy-memo": "nvidia-leadership",
    "bessent-nvidia-10-days": "nvidia-leadership",
    "nvda-chip-probe": "nvidia-leadership",
    "musk-jensen": "nvidia-leadership",
    "lutnick-firing": "nvidia-leadership",
    "houthi-southern-saudi-strikes": "houthis-red-sea",
    "houthi-saudi-coalition": "houthis-red-sea",
    "houthi-saudi-aramco": "houthis-red-sea",
    "riyadh-missiles": "houthis-red-sea",
    "riyadh-aramco-missile": "houthis-red-sea",
    "btc-selloff": "btc",
    "btc80k": "btc",
    "btc-weekend-liquidation": "btc",
    "crypto": "btc",
    "crypto-weekend": "btc",
    "binance-hack": "btc",
    "binance-fbi-north-korea": "btc",
    "binance-withdrawals-resume": "btc",
    "binance-outflows-after-reopen": "btc",
    "ai-bubble": "ai-capex",
    "aibubble": "ai-capex",
    "aicapex": "ai-capex",
    "altman-dram": "ai-capex",
    "anthropic": "ai-capex",
    "anthropic-ipo-power": "ai-capex",
    "anthropic-openai": "ai-capex",
    "anthropic-redteam-misframe": "ai-capex",
    "openai-round": "ai-capex",
    "softbank": "ai-capex",
    "softbank-turbines": "ai-capex",
    "airlines-ground-stop": "ground-stop",
    "faa-ground-stop": "ground-stop",
    "ground-stop-status": "ground-stop",
    "ground-stop-sports-travel": "ground-stop",
    "l3harris-faa-outage": "ground-stop",
    "l3harris-lhx-ah": "ground-stop",
    "nws-outage-lhx": "ground-stop",
    "tesla-spacex-merger": "tesla-spacex",
    "teslaspacex": "tesla-spacex",
    "starship-flight15": "tesla-spacex",
    "spacexwireless": "tesla-spacex",
    "payrolls": "fed-week",
    "cuba-us-attack": "cuba",
    "msft365-outage": "ground-stop",
    "iron-gate": "iran-gulf",
    "germanykospi": "iran-gulf",
    "nostriketoday": "iran-gulf",
    "deitaone": "iran-gulf",
    "futures-open-iran": "iran-gulf",
    "iran": "iran-gulf",
    "iranstrike": "iran-gulf",
    "iranoil": "iran-gulf",
    "iranwar": "iran-gulf",
    "iran-hormuz": "iran-gulf",
    "iran-qeshm": "iran-gulf",
    "iran-strikes-official": "iran-gulf",
    "iran-strikes-nov4": "iran-gulf",
    "iran-korean-tanker-ban": "iran-gulf",
    "hormuz": "iran-gulf",
    "hormuzproposal": "iran-gulf",
    "hormuz-khasab-ukmto-tanker": "iran-gulf",
    "hormuz-mines-irgc-claim": "iran-gulf",
    "hormuz-48h-reopen-plan": "iran-gulf",
    "hormuz-huda-mines": "iran-gulf",
    "hormuz-limpet-mine": "iran-gulf",
    "hormuz-ukmto-projectile-selat-storm": "iran-gulf",
    "hormuz-selat-storm-china-support": "iran-gulf",
    "hormuz-mined-tankers": "iran-gulf",
    "hormuz-tanker-mines": "iran-gulf",
    "hormuz-closed": "iran-gulf",
    "hormuz-iran": "iran-gulf",
    "tabriz": "iran-gulf",
    "tabrizdrone": "iran-gulf",
    "qeshm-explosions": "iran-gulf",
    "qeshm-strike": "iran-gulf",
    "qeshm-bandar-kong-strike": "iran-gulf",
    "southern-iran-explosions": "iran-gulf",
    "centcom-iran-strike": "iran-gulf",
    "strikestomorrow": "iran-gulf",
    "third-carrier-iran": "iran-gulf",
    "carrier-khasab-korea-tanker": "iran-gulf",
    "qatar-breakthrough-report": "iran-gulf",
    "qatar-lng-carrier-al-mayeda": "iran-gulf",
    "qatartalks": "iran-gulf",
    "khasab-oman-drone": "iran-gulf",
    "oman-oil-spill": "iran-gulf",
    "oilslick": "iran-gulf",
    "sirik": "iran-gulf",
    "evacuation": "iran-gulf",
    "us-tankers-ramon-israel": "iran-gulf",
    "trump-iran-drone-plot": "iran-gulf",
    "ukmto-iran-response": "iran-gulf",
    "zerohedge-hormuz-aramco": "iran-gulf",
    "khamenei-unrestricted-response": "iran-gulf",
    "irgc-mines-tankers": "iran-gulf",
    "irgc-cargo-ship-uae-rescue-aramco": "iran-gulf",
    "velos-sapphire": "iran-gulf",
    "oilmonday": "iran-gulf",
    "oilopen": "iran-gulf",
}
HOUTHI_ELSE_IRAN = {
    "dammam-strike",
    "ras-tanura",
    "aramco-abqaiq-airport",
    "saudi-eastern-province-sirens",
}
EUROPE_THEMES = {"france-protests", "germany-cost-of-living-protests"}
# Off-topic search hits. Left untagged on purpose.
SKIP_THEMES = {"qeshm-miller", "amtrak-starship-skynet"}

KEYWORD_NARRATIVES = {
    "uap": re.compile(r"ufo|\buaps?\b|extraterrestrial|area\s*51|\bnhi\b|flying saucer|unidentified (?:aerial|anomalous)|aliens?\s+exist|(?:ufo|uap|alien).{0,80}disclosure|disclosure.{0,80}(?:ufo|uap|alien)", re.I),
    "iran": re.compile(r"\biran\b|iranian|tehran|khamenei|\birgc\b", re.I),
    "fed-rates": re.compile(r"\bfed\b|federal reserve|\bfomc\b|\bpowell\b|rate cut|interest rate|\binflation\b|\bcpi\b|\bppi\b|producer price|basis point", re.I),
    "affordability": re.compile(r"afford|cost of living|cost-of-living|grocery|\bhousing\b|\brenter\b|\brent\b", re.I),
    "us-elections": re.compile(r"election|midterm|ballot|\bvot(?:e|es|ed|ing|er|ers)\b|\bsenator\b|\bcampaign\b|\bimpeach", re.I),
    "immigration": re.compile(r"immigr|deport|\bice\b|\bborder\b|illegal alien|asylum|migrant|undocumented|non-?citizen|homeland security|\bdhs\b|\bvisa\b|sanctuary|\baliens?\b", re.I),
    "europe-protests": re.compile(r"protest|\briots?\b|\brioters?\b|unrest|demonstrat|hit the streets|take to the streets|\bmacron\b|france is burning|\bburning\b", re.I),
}
HOUTHI_RE = re.compile(r"\bhouthi|\byemen\b|red sea", re.I)
NVIDIA_RE = re.compile(
    r"jensen huang|stand with jensen|#standwithjensen|bringjensenback|bring jensen back|reinstate jensen"
    r"|(?:nvidia|\bnvda\b).{0,60}(?:succession|chief executive)"
    r"|bessent.{0,40}nvidia|nvidia.{0,40}bessent"
    r"|(?:chip probe|probed).{0,40}(?:nvidia|\bnvda\b)|(?:nvidia|\bnvda\b).{0,40}(?:chip probe|illegally sold)",
    re.I,
)
GROUND_RE = re.compile(r"ground stop|l3harris", re.I)
FED_RE = re.compile(r"federal reserve|fed chair|\bfomc\b|\bwarsh\b", re.I)
TESLA_RE = re.compile(r"tesla.{0,40}spacex|spacex.{0,40}tesla|starship flight", re.I)
AI_RE = re.compile(r"\banthropic\b|\bopenai\b|ai bubble|softbank.{0,30}turbine", re.I)
IRAN_RE = re.compile(
    r"\bhormuz\b|\birgc\b|khamenei|\btehran\b|\bqeshm\b|persian gulf|bandar abbas"
    r"|\biran\b.{0,80}(?:strike|tanker|missile|drone|mine|hormuz|gulf|war)",
    re.I,
)
BTC_RE = re.compile(r"\bbitcoin\b|\$BTC\b|\bBTC\b|\bbinance\b", re.I)
CUBA_RE = re.compile(
    r"\bd[ií]az-canel\b|military readiness"
    r"|\bcuba\b.{0,80}(?:attack|strike|invasion|defend|war|braces)"
    r"|(?:attack|strike|invasion|war).{0,80}\bcuba\b",
    re.I,
)
# Phrase narratives on a wire timeline. These are tighter than the October
# keyword list: "ice" is not ICE, "selection" is not an election, and a t.co
# token is not a UAP. URLs are removed before matching.
IMMIGRATION_RE = re.compile(
    r"immigr|deport|illegal alien|\basylum\b|\bmigrants?\b|undocumented|homeland security|\bdhs\b"
    r"|sanctuary|\bborder (?:patrol|wall|crisis|security)",
    re.I,
)
ICE_RE = re.compile(r"\bICE\b")
ELECTIONS_RE = re.compile(r"\bmidterms?\b|\bballots?\b|\belections?\b|\bimpeach|\bsenator\b", re.I)
UAP_RE = re.compile(
    r"\bufo\b|\buaps?\b|extraterrestrial|area\s*51|\bnhi\b|flying saucer|unidentified (?:aerial|anomalous)",
    re.I,
)
AFFORDABILITY_RE = re.compile(
    r"afford|cost of living|cost-of-living|grocery|\bhousing\b|\brenter\b|\brent\b",
    re.I,
)
FED_RATES_RE = re.compile(
    r"\bfed\b|federal reserve|\bfomc\b|\bpowell\b|rate cut|interest rate|\binflation\b|\bcpi\b|\bppi\b|producer price|basis point",
    re.I,
)
IRAN_WORD_RE = re.compile(r"\biran\b|iranian|tehran|khamenei|\birgc\b", re.I)
PROTEST_RE = re.compile(r"protest|\briots?\b|\brioters?\b|unrest|demonstrat", re.I)
EUROPE_PLACE_RE = re.compile(
    r"frankfurt|\bparis\b|\bgermany\b|\bfrance\b|\bmacron\b|\bspain\b|\bitaly\b|\bgreece\b|\blondon\b|\buk\b",
    re.I,
)
URL_RE = re.compile(r"https?://\S+")


def read_rows(path):
    with open(path, newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def fetched_at(value):
    value = (value or "").strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return f"{value}T00:00:00.000Z"
    return value


def earlier(left, right):
    if left["created_at"] != right["created_at"]:
        return left["created_at"] < right["created_at"]
    return int(left["post_id"]) < int(right["post_id"])


def theme_of(source, text):
    if source == "wire-from-batch:gulf-oil-theme":
        return "iran-gulf"
    if not source.startswith("theme-search:"):
        return ""
    key = source.split(":", 1)[1]
    if key in SKIP_THEMES:
        return ""
    if key in EUROPE_THEMES:
        if KEYWORD_NARRATIVES["europe-protests"].search(text):
            return "europe-protests"
        return ""
    if key in HOUTHI_ELSE_IRAN:
        return "houthis-red-sea" if HOUTHI_RE.search(text) else "iran-gulf"
    if key == "msft365-outage" and not GROUND_RE.search(text):
        return ""
    return THEME.get(key, "")


def keyword_text(text):
    return URL_RE.sub(" ", text)


def phrase_narrative(raw):
    """Phrase-narrative tag. It has to be one the board's keyword list accepts on the raw text."""
    text = keyword_text(raw)
    candidate = ""
    if PROTEST_RE.search(text) and EUROPE_PLACE_RE.search(text):
        candidate = "europe-protests"
    elif IMMIGRATION_RE.search(text) or ICE_RE.search(raw):
        candidate = "immigration"
    elif ELECTIONS_RE.search(text):
        candidate = "us-elections"
    elif UAP_RE.search(text):
        candidate = "uap"
    elif AFFORDABILITY_RE.search(text):
        candidate = "affordability"
    elif FED_RATES_RE.search(text):
        candidate = "fed-rates"
    elif IRAN_WORD_RE.search(text):
        candidate = "iran"
    if candidate and KEYWORD_NARRATIVES[candidate].search(raw):
        return candidate
    return ""


def keyword_of(raw, created_at):
    day = created_at[:10]
    text = keyword_text(raw)
    if (
        PROTEST_RE.search(text)
        and EUROPE_PLACE_RE.search(text)
        and KEYWORD_NARRATIVES["europe-protests"].search(raw)
    ):
        return "europe-protests"
    if HOUTHI_RE.search(text):
        return "houthis-red-sea"
    if NVIDIA_RE.search(text):
        return "nvidia-leadership"
    if day >= "2026-11-12" and GROUND_RE.search(text):
        return "ground-stop"
    if day >= "2026-11-06" and FED_RE.search(text):
        return "fed-week"
    if TESLA_RE.search(text):
        return "tesla-spacex"
    if AI_RE.search(text):
        return "ai-capex"
    if IRAN_RE.search(text):
        return "iran-gulf"
    if BTC_RE.search(text):
        return "btc"
    if CUBA_RE.search(text):
        return "cuba"
    return phrase_narrative(raw)


def action_of(row):
    text = row["text"].lstrip()
    if text.startswith("RT @"):
        return "repost"
    return row["action"]


def truncation(text):
    # Same cutoff as scripts/check-posts.mjs: unknown is only for a short row.
    if len(text.rstrip()) >= 250:
        return "false", "verified"
    return "false", "unknown"


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: load-nov15-corpus.py POSTS.csv ACCOUNTS.csv")
    upload_posts = read_rows(sys.argv[1])
    upload_accounts = read_rows(sys.argv[2])
    posts = read_rows(DATA / "posts.csv")
    accounts = read_rows(DATA / "accounts.csv")
    narratives = read_rows(DATA / "narratives.csv")
    have_posts = {row["post_id"] for row in posts}
    have_accounts = {row["handle"] for row in accounts}
    have_narratives = {row["narrative_id"] for row in narratives}

    new_narratives = [row for row in NEW_NARRATIVES if row[0] not in have_narratives]
    with open(DATA / "narratives.csv", "a", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerows(new_narratives)

    new_accounts = []
    for row in sorted(upload_accounts, key=lambda item: item["handle"].lower()):
        if row["handle"] in have_accounts:
            continue
        have_accounts.add(row["handle"])
        new_accounts.append({**row, "fetched_at": fetched_at(row["fetched_at"])})
    with open(DATA / "accounts.csv", "a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=ACC_COLS, lineterminator="\n")
        writer.writerows(new_accounts)

    fresh = [row for row in upload_posts if row["post_id"] not in have_posts]
    fresh.sort(key=lambda row: (row["created_at"], int(row["post_id"])))
    narrative_of = {row["post_id"]: row["narrative_id"] for row in posts}
    prepared = []
    for row in fresh:
        text = row["text"]
        narrative = theme_of(row["source"], text) or keyword_of(text, row["created_at"])
        narrative_of[row["post_id"]] = narrative
        prepared.append(row)

    by_id = {row["post_id"]: row for row in posts}
    for row in prepared:
        by_id[row["post_id"]] = row
    for row in prepared:
        if narrative_of[row["post_id"]]:
            continue
        parent_id = row["ref_post_id"]
        parent_narrative = narrative_of.get(parent_id, "")
        parent = by_id.get(parent_id)
        if not parent_narrative or parent is None or not earlier(parent, row):
            continue
        pattern = KEYWORD_NARRATIVES.get(parent_narrative)
        if pattern is not None:
            threaded = row["action"] in ("reply", "quote")
            if not threaded and not pattern.search(row["text"]):
                continue
        narrative_of[row["post_id"]] = parent_narrative

    accounts_by_handle = {row["handle"]: row for row in accounts}
    for row in prepared:
        if narrative_of[row["post_id"]]:
            continue
        if not row["source"].startswith("tracked-from-batch"):
            continue
        lane = accounts_by_handle.get(row["handle"], {}).get("narrative_id", "")
        if lane:
            narrative_of[row["post_id"]] = lane

    # A wire timeline includes every headline. Keep the ones that join a
    # narrative. Tracked-account posts stay, on their lane when no theme hits.
    skipped = 0
    kept = []
    for row in prepared:
        if narrative_of[row["post_id"]] or not row["source"].startswith("wire-from-batch"):
            kept.append(row)
            continue
        skipped += 1
        by_id.pop(row["post_id"], None)
    prepared = kept

    same_text = defaultdict(list)
    for row in list(posts) + prepared:
        same_text[row["text"].strip()].append(row)
    for group in same_text.values():
        group.sort(key=lambda row: (row["created_at"], int(row["post_id"])))

    retargeted = cleared = 0
    written = []
    for row in prepared:
        ref = row["ref_post_id"]
        flag = "false"
        target = by_id.get(ref) if ref else None
        if target is not None and earlier(target, row):
            earliest = same_text[target["text"].strip()][0]
            if earliest["post_id"] == target["post_id"]:
                flag = "true"
            elif earlier(earliest, row):
                ref = earliest["post_id"]
                flag = "true"
                retargeted += 1
            else:
                ref = ""
                cleared += 1
        elif target is not None:
            ref = ""
            cleared += 1
        text_truncated, full_text = truncation(row["text"])
        written.append({
            "post_id": row["post_id"],
            "handle": row["handle"],
            "created_at": row["created_at"],
            "action": action_of(row),
            "text": row["text"],
            "url": row["url"],
            "narrative_id": narrative_of[row["post_id"]],
            "ref_post_id": ref,
            "source": row["source"],
            "fetched_at": fetched_at(row["fetched_at"]),
            "text_truncated": text_truncated,
            "full_text": full_text,
            "ref_in_corpus": flag,
        })

    missing_handles = sorted({row["handle"] for row in written if row["handle"] not in have_accounts})
    if missing_handles:
        raise SystemExit(f"posts with no account: {missing_handles[:8]}")
    bad_urls = [row["post_id"] for row in written if not row["url"].startswith("https://x.com/") or not row["url"].rstrip("/").endswith(row["post_id"])]
    if bad_urls:
        raise SystemExit(f"posts with a bad X URL: {bad_urls[:8]}")

    with open(DATA / "posts.csv", "a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=POST_COLS, lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
        writer.writerows(written)

    counts = Counter(row["narrative_id"] or "(untagged)" for row in written)
    print(f"narratives +{len(new_narratives)} accounts +{len(new_accounts)} posts +{len(written)} wires skipped {skipped}")
    print(f"ref retargeted {retargeted} cleared {cleared}")
    if written:
        print(f"new post dates {written[0]['created_at'][:10]} .. {written[-1]['created_at'][:10]}")
    for key, count in counts.most_common():
        print(f"  {count:5} {key}")
    unmapped = Counter()
    for row in written:
        source = row["source"]
        if source.startswith("theme-search:") and not row["narrative_id"]:
            unmapped[source] += 1
    if unmapped:
        print("theme rows left untagged:")
        for key, count in unmapped.most_common():
            print(f"  {count:5} {key}")


if __name__ == "__main__":
    main()

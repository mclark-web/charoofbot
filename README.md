# GCBot

Brand rules: read BRAND.md before any UI change; deviations are an automatic MUST-FIX.

A GradedCalls product. Zero-cost proof of the GC Scale, where higher means more authentic. The demo never calls the X API, never asks for a key, and does not need a database or a language model.

Built for accountability in an age of market fomo, prediction craze, and loud anonymous voices.

## What you can do

- Open the dashboard. Figure 1 is narrative volume (which frames are being sewn, and how hard). Figure 1b is the same narratives split by poster age: accounts under 30 days, and accounts from 30 days to under 1 year. Figure 2 links narratives that share accounts and rings the ones new accounts dominate. Copied-language clusters and the flagged-amplifier list stay separate. The list leads with the lowest organic reach. A new-account badge sits beside a grade and does not change it.
- Open a cluster for the originator, the timeline, and a normalized text diff.
- Open an account. Original voice and organic reach are two authenticity meters. Higher means more trustworthy. They are not added together. A withheld amplifier signal reads Not graded yet.
- Paste a duplicate of a fixture post on `/paste`. Decorations (links, @handles, cashtags, emoji) are stripped, and an exact copy lowers original voice. A slogan without the copied paragraph is a boost hit, not copied wording.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No `.env` file is required.

`npm test` checks the SHA-256 fingerprint, the fixture roles (exact, near, template, amplifier, originator), and the paste bench.

## Try the paste bench

On `/paste`, use **Exact fixture duplicate**. That sample is the AI-capex originator text plus a URL, an @mention-free cashtag, and an emoji. The scorer should call it an exact clone of `@ledger_mina`.

Other buttons load a one-word near-duplicate, amplifier framing, and an unrelated note.

You can also paste your own text, several posts split by a line that is only `---`, or JSON:

```json
[
  {"account": "@pasted_demo", "text": "paste a fixture sentence here"}
]
```

## How matching works

1. Lowercase.
2. Strip URLs, @handles, cashtags, emoji, punctuation, and extra whitespace.
3. SHA-256 the result for exact copies.
4. Token Jaccard ≥ 0.85 is a near-duplicate.
5. Two or more shared 4-grams, with Jaccard ≥ 0.5 and below 0.85, is a template skeleton.
6. Copies only join a cluster within 14 days of first seen. A leading `RT @handle:` is excluded.

Thresholds, the amplifier formula, and the new-account rules are printed on `/methodology` from the same constants the code uses. Ages are `accountCreatedAt` on each account (the public X created date), measured at 18 Oct 2026 21:00 UTC. That is a file in the repo, not a live X profile lookup. Paste can send `accountCreatedAt` or `ageDays`. Omit both and the age is unknown.

A cluster or narrative is highlighted when accounts under 1 year wrote at least half of its posts. The under-30-day share is reported separately and uses the same half-volume line.

The corpus (`data/corpus.json`) is real public X posts as of 18 Oct 2026: recent posts from the accounts tracked on GradedCalls Sports and FinTwit, plus copies and quote posts of them. It is generated from the CSVs in `data/gcbot/` (see below). The paste bench and the detector tests use a separate synthetic practice set, `data/fixture-corpus.json`, with deliberate copies and boosters. Follower counts are bait. They are displayed and not scored, so a large copied account does not rise on organic reach unless it also boosts. The flagged-amplifier list still leads with the lowest authenticity.

## Corpus data (CSV source of truth)

`data/gcbot/*.csv` is the source of truth. `data/corpus.json` is generated from it; do not edit the JSON by hand.

- `accounts.csv`: one row per X account, keyed by `handle`. `tracked_board` is `sports` or `fintwit` for accounts tracked on the other GradedCalls boards and empty for accounts found copying or quoting them. `narrative_id` is the tracked account's lane.
- `posts.csv`: one row per public post, keyed by `post_id`, with `handle`, `created_at` (UTC), `action` (`post`, `quote`, `reply`), `text`, `url`, `narrative_id`, `ref_post_id` (the tracked post it copies or quotes), `source` (`timeline`, `phrase-search`, `quotes`) and `fetched_at`.
- `narratives.csv`: one row per narrative. `frame_phrases` is optional, `|`-separated.

The files are append-only. To add an account or a weekly refresh, append rows (new handles to `accounts.csv`, new post ids to `posts.csv`) and run:

```bash
npm run corpus
```

The script has no dependencies. It fails on a duplicate id, a post whose handle is not in `accounts.csv`, a bad date or action, or an unknown narrative. Rows already present are never re-fetched or rewritten.

## Deploy on Vercel Hobby ($0)

1. Push the repo and import it as a Next.js project.
2. Leave environment variables empty. The app does not read any.
3. Build command `npm run build`, output left at the Next.js default.
4. Deploy. The Hobby tier is enough because pages are static and the paste bench runs in the browser.

Do not add a paid X API integration to make the demo “real.” A later phase can, when a budget exists. This phase is the proof that the two detectors and the volume graph work on text you already have.

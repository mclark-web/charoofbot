# Charoof Bot

Zero-cost proof of clone speech, narrative amplifiers, and a volume graph. The demo never calls the X API, never asks for a key, and does not need a database or a language model.

Built for accountability in an age of market fomo, prediction craze, and loud anonymous voices.

## What you can do

- Open the dashboard. Figure 1 is narrative volume (which frames are being sewn, and how hard). Figure 2 links narratives that share accounts. Clone clusters and the amplifier leaderboard are separate.
- Open a cluster for the originator, the timeline, and a normalized text diff.
- Open an account. Clone speech and amplifier grades are two meters. They are not added together.
- Paste a duplicate of a fixture post on `/paste`. Decorations (links, @handles, cashtags, emoji) are stripped, and an exact copy is flagged as clone speech. A slogan without the copied paragraph is an amplifier-style hit, not a clone.

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

Thresholds and the amplifier formula are printed on `/methodology` from the same constants the code uses.

The corpus is synthetic (`data/corpus.json`): 12 narratives and a few dozen posts, with deliberate clones and boosters. Follower counts are bait. They are displayed and not scored, so a large clone account does not top the amplifier board.

## Deploy on Vercel Hobby ($0)

1. Push the repo and import it as a Next.js project.
2. Leave environment variables empty. The app does not read any.
3. Build command `npm run build`, output left at the Next.js default.
4. Deploy. The Hobby tier is enough because pages are static and the paste bench runs in the browser.

Do not add a paid X API integration to make the demo “real.” A later phase can, when a budget exists. This phase is the proof that the two detectors and the volume graph work on text you already have.

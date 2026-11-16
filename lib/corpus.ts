import corpusJson from "@/data/corpus.json";
import { analyzeCorpus } from "./detect";
import { clockFromPosts, type ScoreClock } from "./thresholds";
import type { Corpus, Report } from "./types";

export function getCorpus(): Corpus {
  return corpusJson as Corpus;
}

/** Window end and age clock from the latest post. Does not score the corpus. */
export function liveClock(): ScoreClock {
  return clockFromPosts(getCorpus().posts);
}

// The corpus file does not change during a process. Score it once so static
// account and cluster pages do not repeat the match pass.
let scored: Report | undefined;

export function getReport(): Report {
  scored ??= analyzeCorpus(getCorpus());
  return scored;
}

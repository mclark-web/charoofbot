import { cache } from "react";
import corpusJson from "@/data/corpus.json";
import { analyzeCorpus } from "./detect";
import { clockFromPosts, type ScoreClock } from "./thresholds";
import type { Corpus } from "./types";

export function getCorpus(): Corpus {
  return corpusJson as Corpus;
}

/** Window end and age clock from the latest post. Does not score the corpus. */
export function liveClock(): ScoreClock {
  return clockFromPosts(getCorpus().posts);
}

export const getReport = cache(() => analyzeCorpus(getCorpus()));

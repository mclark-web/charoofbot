import { cache } from "react";
import corpusJson from "@/data/corpus.json";
import { analyzeCorpus } from "./detect";
import type { Corpus } from "./types";

export function getCorpus(): Corpus {
  return corpusJson as Corpus;
}

export const getReport = cache(() => analyzeCorpus(getCorpus()));

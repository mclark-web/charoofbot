import corpusJson from "../data/corpus.json";
import type { Corpus } from "./types";

const corpus = corpusJson as Corpus;
const aiOrigin = corpus.posts.find((post) => post.id === "ai-origin")?.text ?? "";

/** Paste-bench examples. The exact sample is a fixture post with decoration the normalizer strips. */
export const samplePastes = {
  exact: `@pasted_demo\n${aiOrigin} 🚀 https://example.com/thread $NVDA`,
  near: "@pasted_demo\nThe AI capex supercycle is not a slogan, it is a purchase order. Hyperscalers will keep spending through 2027, and the picks and shovels vendors get paid before the products do.",
  amp: "@pasted_demo\nAI capex supercycle keeps showing up in my replies this week, and I still have not opened a supplier filing.",
  clean:
    "@pasted_demo\nLibrary note for my own desk: reconcile the source PDF before repeating a sentence.",
} as const;

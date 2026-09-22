import type { Metadata } from "next";
import { PasteBench } from "@/components/paste-bench";

export const metadata: Metadata = {
  title: "Paste bench",
  description: "Paste tweet text and compare it with the Charoof Bot fixture corpus. No API key.",
};

export default function PastePage() {
  return (
    <div className="grid gap-8">
      <header className="max-w-3xl">
        <p className="kicker">Ingestion · $0</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink">Paste bench</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          Paste one or more posts. Separate them with a line that is only <span className="font-mono">---</span>, or
          send a JSON array of <span className="font-mono">{`{ "account", "text" }`}</span>. Text is normalized, hashed,
          and compared with the fixture corpus and the rest of the batch. Retweets are set aside. Clone hits and
          amplifier hits are reported on separate lines.
        </p>
      </header>
      <PasteBench />
      <section className="max-w-3xl text-sm leading-relaxed text-ink-soft">
        <h2 className="font-serif text-xl text-ink">JSON shape</h2>
        <pre className="mt-3 overflow-x-auto border border-rule bg-paper-raised p-3 font-mono text-xs leading-6 text-ink">{`[
  {"account": "@pasted_demo", "text": "…", "postedAt": "2026-09-22T15:00:00.000Z"},
  {"handle": "other", "text": "…", "action": "quote"}
]`}</pre>
        <p className="mt-3">
          Omitted timestamps use 22 Sep 2026 15:00 UTC, which still sits inside the 14-day window of the fixture
          corpus. A timestamp outside that window will not join an older cluster.
        </p>
      </section>
    </div>
  );
}

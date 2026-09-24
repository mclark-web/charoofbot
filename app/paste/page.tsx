import type { Metadata } from "next";
import { PasteBench } from "@/components/paste-bench";

export const metadata: Metadata = {
  title: "Paste bench",
  description: "Paste tweet text and compare it with the GCBot fixture corpus. No API key.",
};

export default function PastePage() {
  return (
    <div className="grid gap-8">
      <header className="max-w-3xl">
        <p className="kicker">Ingestion · $0</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink">Paste bench</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          Paste one or more posts. Separate them with a line that is only <span className="font-mono">---</span>, or
          send a JSON array of <span className="font-mono">{`{ "account", "text" }`}</span>. An optional created date
          or age in days flags the poster. Leave both off and the age stays unknown. Text is normalized, hashed, and
          compared with the fixture corpus and the rest of the batch. Retweets are set aside. Copied wording and boosts
          are reported on separate lines. The meters show authenticity, higher means more authentic, and neither grade absorbs the age flag.
        </p>
      </header>
      <PasteBench />
      <section className="max-w-3xl text-sm leading-relaxed text-ink-soft">
        <h2 className="font-serif text-xl text-ink">JSON shape</h2>
        <pre className="mt-3 max-w-full min-w-0 whitespace-pre-wrap border border-rule bg-paper-raised p-3 font-mono text-xs leading-6 text-ink">{`[
  {"account": "@pasted_demo", "text": "…", "postedAt": "2026-09-22T15:00:00.000Z"},
  {"handle": "other", "text": "…", "action": "quote", "accountCreatedAt": "2026-09-08"},
  {"account": "yearling", "text": "…", "ageDays": 120}
]`}</pre>
        <p className="mt-3">
          Omitted timestamps use 22 Sep 2026 15:00 UTC, which still sits inside the 14-day window of the fixture
          corpus. A timestamp outside that window will not join an older cluster. Ages use that same clock.{" "}
          <span className="font-mono">accountCreatedAt</span>, <span className="font-mono">createdAt</span>, or{" "}
          <span className="font-mono">joined</span> is a date. <span className="font-mono">ageDays</span> is the age in
          days when you do not have a date. Omit both and the finding is marked age unknown. A handle that already
          exists in the fixture directory keeps its fixture created date.
        </p>
        <p className="mt-3">
          Plain text can carry the same fields on their own lines, or on the handle line:{" "}
          <span className="font-mono">joined: 2026-09-08</span> or <span className="font-mono">age: 14d</span>.
        </p>
      </section>
    </div>
  );
}

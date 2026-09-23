"use client";

import { useState } from "react";

const DRAFT = `GCBot false-positive appeal (demo draft)
Handle:
Post text:
Match shown (exact / near / template / amplifier):
Why this should be reviewed:
Check: normalization, 14-day window, and whether the first-seen post is actually earlier.`;

export function AppealDraft() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="border border-rule bg-paper-raised p-4">
      <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-ink">{DRAFT}</pre>
      <button
        type="button"
        className="mt-3 border border-ink bg-ink px-3 py-1.5 text-sm text-paper"
        onClick={() => {
          void navigator.clipboard.writeText(DRAFT).then(() => {
            setCopied(true);
          });
        }}
      >
        {copied ? "Copied" : "Copy appeal draft"}
      </button>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        This demo does not send email or store a queue. A live path is a form plus manual review by the solo
        operator. Copy the draft and keep it with the post you want re-read.
      </p>
    </div>
  );
}

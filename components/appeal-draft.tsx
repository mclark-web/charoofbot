"use client";

import { useState } from "react";

const DRAFT = `GCBot false-positive appeal (demo draft)
Handle:
Post text:
Match shown (exact / near / template / attributed / syndicated / amplifier):
Why this should be reviewed:
Check: normalization, 14-day window, self-repeat (same account), earliest poster in the cluster, a via / Source / per / h/t credit that names the account that was copied or that post's outlet (otherwise a verbatim or near copy stays a copy; a bare h/t does not), and whether both accounts are syndicating outlets.`;

export function AppealDraft() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="border border-rule bg-paper-raised p-4">
      <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-ink">{DRAFT}</pre>
      <button
        type="button"
        className="btn btn-primary mt-3"
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

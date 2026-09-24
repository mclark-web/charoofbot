"use client";

import Link from "next/link";
import { useState } from "react";
import { AgeBadge, LabelBadge } from "@/components/label-badge";
import { amplifierScaleScore, detectorSignal } from "@/components/gc-scale";
import { organicReachMutedNote, organicReachWithheldDetail } from "@/components/organic-reach-copy";
import { ScoreMeter } from "@/components/score-meter";
import { formatAgeDays, formatLatency, matchLabel } from "@/lib/format";
import { runPaste, type PasteRun } from "@/lib/paste";
import { samplePastes } from "@/lib/samples";
import type { AccountReport, AnnotatedPost } from "@/lib/types";

const SAMPLES = [
  { id: "exact", label: "Exact fixture duplicate", text: samplePastes.exact },
  { id: "near", label: "Near-duplicate", text: samplePastes.near },
  { id: "amp", label: "Boost framing", text: samplePastes.amp },
  { id: "clean", label: "Unrelated note", text: samplePastes.clean },
  { id: "fresh", label: "New-account boost", text: samplePastes.fresh },
] as const;

export function PasteBench() {
  const [draft, setDraft] = useState<string>(samplePastes.exact);
  const [outcome, setOutcome] = useState<PasteRun | null>(null);

  function score(text: string) {
    setDraft(text);
    setOutcome(runPaste(text));
  }

  return (
    <div className="grid gap-8">
      <form
        className="grid gap-4 border border-rule bg-paper-raised p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setOutcome(runPaste(draft));
        }}
      >
        <div>
          <label htmlFor="paste" className="kicker">
            Tweet text or JSON
          </label>
          <textarea
            id="paste"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={10}
            spellCheck={false}
            className="mt-2 w-full min-w-11 border border-rule bg-inset p-3 font-mono text-sm leading-6 text-ink placeholder:text-ink-soft"
            placeholder={"@handle\nTweet text\n\n---\n\n@other\nSecond tweet"}
          />
        </div>
        <div className="tap-row">
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => score(sample.text)}
              className="btn"
            >
              {sample.label}
            </button>
          ))}
        </div>
        <div className="tap-row">
          <button type="submit" className="btn btn-primary">
            Score against fixtures
          </button>
          <p className="text-sm text-ink-soft">Runs in the browser. Nothing is uploaded.</p>
        </div>
      </form>

      {outcome ? <PasteResults outcome={outcome} /> : null}
    </div>
  );
}

function PasteResults({ outcome }: { outcome: PasteRun }) {
  return (
    <div className="grid gap-6">
      {outcome.warnings.length > 0 ? (
        <ul className="border border-clay bg-clay-soft px-4 py-3 text-sm text-clay">
          {outcome.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      {outcome.findings.length === 0 ? (
        <p className="text-ink-soft">Nothing to score yet. Paste at least one post.</p>
      ) : (
        <ol className="grid gap-4">
          {outcome.findings.map((finding) => (
            <li key={finding.id}>
              <FindingCard finding={finding} narratives={outcome.report.narratives} />
            </li>
          ))}
        </ol>
      )}
      {outcome.accounts.length > 0 ? (
        <section>
          <h2 className="font-serif text-2xl text-ink">Handles in this paste</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Original voice and organic reach stay in separate meters. Higher means more authentic. A handle that already exists in the fixture
            directory is rescored with its fixture posts plus this paste. A new handle is scored from the paste alone.
          </p>
          <div className="mt-4 grid gap-4">
            {outcome.accounts.map((account) => (
              <AccountSlice key={account.handle} account={account} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FindingCard({
  finding,
  narratives,
}: {
  finding: AnnotatedPost;
  narratives: PasteRun["report"]["narratives"];
}) {
  const cloneKind =
    finding.role === "exact" || finding.role === "near" || finding.role === "template"
      ? finding.role
      : null;
  const frameTitles = finding.frameNarrativeIds.map(
    (id) => narratives.find((narrative) => narrative.id === id)?.title ?? id,
  );

  return (
    <article className="border border-rule bg-paper-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink-soft">@{finding.account}</span>
        {finding.isRetweet ? (
          <span className="meta-badge">Retweet excluded</span>
        ) : cloneKind ? (
          <span className="meta-badge">{matchLabel(cloneKind)}</span>
        ) : (
          <span className="meta-badge">No copied wording</span>
        )}
        {finding.isBoost ? (
          <span className="meta-badge">Boost frame hit</span>
        ) : (
          <span className="meta-badge">No boost frame</span>
        )}
        <AgeBadge band={finding.ageBand} showEstablished showUnknown />
        <span className="font-mono text-xs text-ink-soft">{formatAgeDays(finding.ageDays)}</span>
      </div>
      <p className="mt-3 font-serif text-lg leading-snug text-ink">{finding.text}</p>
      {finding.isRetweet ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          A leading RT @handle: is set aside. It does not lower original voice, and it does not count as organic reach.
        </p>
      ) : null}
      {cloneKind ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="kicker">Matched</dt>
            <dd className="tap-row mt-1">
              {finding.matchedAccount ? (
                <Link href={`/accounts/${finding.matchedAccount}`} className="tap underline decoration-rule">
                  @{finding.matchedAccount}
                </Link>
              ) : (
                "—"
              )}
              {finding.clusterId ? (
                <Link href={`/clusters/${finding.clusterId}`} className="tap underline decoration-rule">
                  open cluster
                </Link>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="kicker">Jaccard / latency</dt>
            <dd className="mt-1 font-mono">
              {finding.jaccard.toFixed(2)}
              {finding.latencyMs !== null ? ` · ${formatLatency(finding.latencyMs)}` : ""}
            </dd>
          </div>
        </dl>
      ) : null}
      {frameTitles.length > 0 ? (
        <p className="mt-3 text-sm text-ink-soft">Frame phrase hits {frameTitles.join(", ")}.</p>
      ) : null}
      <p className="mt-3 break-all font-mono text-xs text-ink-soft">{finding.hash}</p>
    </article>
  );
}

function AccountSlice({ account }: { account: AccountReport }) {
  return (
    <div className="grid gap-3 border border-rule bg-paper-raised p-4 md:grid-cols-2">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-xl">@{account.handle}</h3>
          <LabelBadge label={account.label} />
          <AgeBadge band={account.ageBand} showEstablished showUnknown />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {account.inDirectory ? "Includes fixture history." : "Paste only. Not in the fixture directory."}{" "}
          {account.ageDays === null
            ? "Account age was omitted, so it stays unknown."
            : `Account age ${formatAgeDays(account.ageDays)} at the fixture clock. Not added to either grade.`}
        </p>
      </div>
      <div className="grid gap-3">
        <ScoreMeter
          label="Original voice"
          score={account.cloneScore}
          signal={detectorSignal("clone", account.cloneScore)}
          detail={`${account.clonePostCount} copied post${account.clonePostCount === 1 ? "" : "s"}. Higher means more original. Not mixed with organic reach.`}
        />
        <ScoreMeter
          label="Organic reach"
          score={amplifierScaleScore(account.boostPostCount, account.ampScore, account.boostDays)}
          signal={organicReachMutedNote(account.boostPostCount, account.ampScore, account.boostDays)}
          detail={
            account.passesAmpGate
              ? `${account.boostPostCount} boosts across ${account.boostDays} days. Higher means less of the activity is boosting someone else.`
              : organicReachWithheldDetail(account.boostPostCount, account.boostDays, account.ampScore)
          }
        />
      </div>
    </div>
  );
}

import Link from "next/link";
import { HeadlineScale } from "@/components/headline-scale";
import { LabelBadge } from "@/components/label-badge";
import { SourceLink } from "@/components/source-link";
import { splitBoard } from "@/lib/board";
import { accountSourceUrl, countNoun, formatStamp } from "@/lib/format";
import { liveClock } from "@/lib/corpus";
import { THRESHOLDS } from "@/lib/thresholds";
import type { AccountReport, AnnotatedPost } from "@/lib/types";

export function BestWorst({
  accounts,
  posts,
}: {
  accounts: AccountReport[];
  posts: AnnotatedPost[];
}) {
  const { best, worst, bestTied } = splitBoard(accounts);
  const topScore = best[0]?.gcScore;
  const shown =
    topScore === undefined ? 0 : best.filter((account) => account.gcScore === topScore).length;
  return (
    <section className="grid gap-4">
      <div>
        <p className="kicker">Best / worst</p>
        <h2 className="mt-1 font-serif text-2xl text-ink">Most original and biggest copycats</h2>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">
        As of {formatStamp(liveClock().asOf)}. Lanes include accounts with at least {THRESHOLDS.leaderboardMinPosts} posts
        in the scored window. The GC score is 100 minus the copy score. Most original also needs at least one post
        that is not a copy and not a credited repost.{" "}
        <Link href="/accounts" className="tap underline decoration-rule underline-offset-4 hover:decoration-ink">
          All accounts
        </Link>
        .
      </p>
      <div className="grid min-w-0 gap-6 md:grid-cols-2">
        <Lane
          title="Most original"
          note="Highest GC score."
          accounts={best}
          posts={posts}
          empty="No account has enough posts yet."
          higherIsBetter
          tie={
            bestTied > 1 && topScore !== undefined ? { shown, total: bestTied, score: topScore } : undefined
          }
        />
        <Lane
          title="Biggest copycats"
          note="Lowest GC score under STRONG."
          accounts={worst}
          posts={posts}
          empty="No graded account is under STRONG yet."
          higherIsBetter={false}
        />
      </div>
    </section>
  );
}

function sharedPlace(accounts: AccountReport[], index: number, higherIsBetter: boolean): number {
  const score = accounts[index].gcScore;
  let better = 0;
  for (const account of accounts) {
    if (higherIsBetter ? account.gcScore > score : account.gcScore < score) better += 1;
  }
  return better + 1;
}

function Lane({
  title,
  note,
  accounts,
  posts,
  empty,
  higherIsBetter,
  tie,
}: {
  title: string;
  note: string;
  accounts: AccountReport[];
  posts: AnnotatedPost[];
  empty: string;
  higherIsBetter: boolean;
  tie?: { shown: number; total: number; score: number };
}) {
  const tieNoun = tie && tie.total === 1 ? "account" : "accounts";
  return (
    <div className="min-w-0">
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{note}</p>
      {accounts.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{empty}</p>
      ) : (
        <>
          {tie ? (
            <p className="mt-2 text-xs text-ink-soft">
              Showing {tie.shown} of {tie.total} {tieNoun} tied at {tie.score}; see all on{" "}
              <Link href="/accounts" className="tap underline decoration-rule underline-offset-4 hover:decoration-ink">
                /accounts
              </Link>
              .
            </p>
          ) : null}
          <ul className="mt-3 grid gap-3">
            {accounts.map((account, index) => {
              const place = sharedPlace(accounts, index, higherIsBetter);
              const shares = accounts.filter((item) => item.gcScore === account.gcScore).length > 1;
              return (
                <li key={account.handle} className="grid gap-3 border border-rule bg-paper-raised p-4">
                  <p className="font-mono text-xs text-ink-soft">{shares ? `Place ${place}, tied` : `Place ${place}`}</p>
                  <div className="tap-row">
                    <Link href={`/accounts/${account.handle}`} className="tap font-serif text-lg underline decoration-rule">
                      @{account.handle}
                    </Link>
                    <LabelBadge label={account.label} />
                    <SourceLink href={accountSourceUrl(account.handle, posts)} handle={account.handle} />
                  </div>
                  <p className="font-mono text-xs text-ink-soft">{countNoun(account.postCount, "post")} in window</p>
                  <HeadlineScale account={account} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

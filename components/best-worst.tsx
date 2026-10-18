import Link from "next/link";
import { HeadlineScale } from "@/components/headline-scale";
import { LabelBadge } from "@/components/label-badge";
import { splitBoard } from "@/lib/board";
import { accountSourceUrl, formatStamp } from "@/lib/format";
import { AGE_AS_OF, THRESHOLDS } from "@/lib/thresholds";
import type { AccountReport, AnnotatedPost } from "@/lib/types";

export function BestWorst({
  accounts,
  posts,
}: {
  accounts: AccountReport[];
  posts: AnnotatedPost[];
}) {
  const { best, worst } = splitBoard(accounts);
  return (
    <section className="grid gap-4">
      <div>
        <p className="kicker">Best / worst</p>
        <h2 className="mt-1 font-serif text-2xl text-ink">Most original and biggest copycats</h2>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">
        As of {formatStamp(AGE_AS_OF)}. Lanes include accounts with at least {THRESHOLDS.leaderboardMinPosts} posts
        in the scored window. The GC score is 100 minus the higher of the copy score and the amplifier score.{" "}
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
        />
        <Lane
          title="Biggest copycats"
          note="Lowest GC score under STRONG."
          accounts={worst}
          posts={posts}
          empty="No account under STRONG has enough posts yet."
        />
      </div>
    </section>
  );
}

function Lane({
  title,
  note,
  accounts,
  posts,
  empty,
}: {
  title: string;
  note: string;
  accounts: AccountReport[];
  posts: AnnotatedPost[];
  empty: string;
}) {
  return (
    <div className="min-w-0">
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{note}</p>
      {accounts.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{empty}</p>
      ) : (
        <ol className="mt-3 grid gap-3">
          {accounts.map((account) => (
            <li key={account.handle} className="grid gap-3 border border-rule bg-paper-raised p-4">
              <div className="tap-row">
                <Link href={`/accounts/${account.handle}`} className="tap font-serif text-lg underline decoration-rule">
                  @{account.handle}
                </Link>
                <LabelBadge label={account.label} />
                <a
                  href={accountSourceUrl(account.handle, posts)}
                  className="tap underline decoration-rule underline-offset-4"
                >
                  Source
                </a>
              </div>
              <p className="font-mono text-xs text-ink-soft">
                {account.postCount} posts in window
              </p>
              <HeadlineScale account={account} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

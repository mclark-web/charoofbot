import type { Metadata } from "next";
import Link from "next/link";
import { AccountsBoard } from "@/components/accounts-board";
import { accountSourceUrl, formatStamp } from "@/lib/format";
import { getReport } from "@/lib/corpus";
import { AGE_AS_OF, THRESHOLDS } from "@/lib/thresholds";
import type { AccountReport } from "@/lib/types";

export const metadata: Metadata = {
  title: "Accounts",
  description: "Every scored X account on the GC Scale. Sort by GC score. Higher means more authentic.",
};

type AccountRow = AccountReport & { sourceUrl: string };

export default function AccountsPage() {
  const report = getReport();
  const rows: AccountRow[] = report.accounts.map((account) => ({
    ...account,
    sourceUrl: accountSourceUrl(account.handle, report.posts),
  }));

  return (
    <div className="grid min-w-0 gap-8">
      <header className="max-w-3xl">
        <p className="kicker">
          <Link href="/" className="tap underline decoration-rule underline-offset-4">
            Dashboard
          </Link>{" "}
          / accounts
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink">Accounts</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          As of {formatStamp(AGE_AS_OF)}. One GC score per account: 100 minus the copy score. Amplifier detection
          is not in that number. STRONG is 70 and above. Best/Worst on the dashboard keeps accounts with at least{" "}
          {THRESHOLDS.leaderboardMinPosts} posts in the window. This list includes every tracked account, including
          one with no posts yet.
        </p>
      </header>
      <AccountsBoard rows={rows} />
    </div>
  );
}

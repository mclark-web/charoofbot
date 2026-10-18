"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HeadlineScale } from "@/components/headline-scale";
import { AgeBadge, LabelBadge } from "@/components/label-badge";
import { formatAgeDays } from "@/lib/format";
import { compareText } from "@/lib/order";
import { THRESHOLDS } from "@/lib/thresholds";
import type { AccountReport } from "@/lib/types";

type AccountRow = AccountReport & { sourceUrl: string };

type SortKey = "gc-desc" | "gc-asc" | "posts" | "handle";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "gc-desc", label: "GC score high" },
  { id: "gc-asc", label: "GC score low" },
  { id: "posts", label: "Posts" },
  { id: "handle", label: "Name" },
];

const SORT_LABEL: Record<SortKey, string> = {
  "gc-desc": "Sorted by GC score, highest first",
  "gc-asc": "Sorted by GC score, lowest first",
  posts: "Sorted by posts",
  handle: "Sorted by name",
};

function gradedFirst(a: AccountRow, b: AccountRow): number {
  if (a.graded === b.graded) return 0;
  return a.graded ? -1 : 1;
}

export function AccountsBoard({ rows }: { rows: AccountRow[] }) {
  const [sort, setSort] = useState<SortKey>("gc-desc");
  const ordered = useMemo(() => {
    const next = [...rows];
    next.sort((a, b) => {
      const graded = gradedFirst(a, b);
      if (sort === "gc-asc") return graded || a.gcScore - b.gcScore || compareText(a.handle, b.handle);
      if (sort === "posts") return b.postCount - a.postCount || graded || b.gcScore - a.gcScore || compareText(a.handle, b.handle);
      if (sort === "handle") return compareText(a.handle, b.handle);
      return graded || b.gcScore - a.gcScore || compareText(a.handle, b.handle);
    });
    return next;
  }, [rows, sort]);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft">{SORT_LABEL[sort]}</p>
      <div className="tap-row" role="group" aria-label="Sort accounts">
        {SORTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="btn"
            aria-pressed={sort === item.id}
            onClick={() => setSort(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <ul className="grid gap-3 md:hidden">
        {ordered.map((account) => (
          <li key={account.handle}>
            <AccountCard account={account} />
          </li>
        ))}
      </ul>
      <div className="hidden max-w-full min-w-0 border border-rule md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Accounts sorted by GC score</caption>
          <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">GC score</th>
              <th className="px-3 py-2 font-medium">Posts</th>
              <th className="px-3 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((account) => (
              <tr key={account.handle} className="border-t border-rule align-top">
                <td className="px-3 py-3">
                  <AccountIdentity account={account} />
                </td>
                <td className="min-w-0 px-3 py-3">
                  <HeadlineScale account={account} />
                </td>
                <td className="px-3 py-3 font-mono">{account.postCount}</td>
                <td className="px-3 py-3">
                  <a href={account.sourceUrl} className="tap underline decoration-rule underline-offset-4">
                    Source
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountCard({ account }: { account: AccountRow }) {
  return (
    <article className="grid gap-3 border border-rule bg-paper-raised p-4">
      <AccountIdentity account={account} />
      <HeadlineScale account={account} />
      <p className="font-mono text-xs text-ink-soft">{account.postCount} posts in window</p>
      <a href={account.sourceUrl} className="tap underline decoration-rule underline-offset-4">
        Source
      </a>
    </article>
  );
}

function AccountIdentity({ account }: { account: AccountRow }) {
  return (
    <div>
      <div className="tap-row">
        <Link href={`/accounts/${account.handle}`} className="tap font-serif text-lg underline decoration-rule">
          @{account.handle}
        </Link>
        <LabelBadge label={account.label} />
        <AgeBadge band={account.ageBand} showEstablished />
      </div>
      <p className="mt-1 text-sm text-ink-soft">{account.name}</p>
      <p className="mt-1 font-mono text-xs text-ink-soft">{formatAgeDays(account.ageDays)}</p>
      {account.postCount < THRESHOLDS.leaderboardMinPosts ? (
        <p className="mt-1 text-xs text-ink-soft">
          Under the {THRESHOLDS.leaderboardMinPosts}-post minimum for Best/Worst
        </p>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HeadlineScale } from "@/components/headline-scale";
import { AgeBadge, LabelBadge } from "@/components/label-badge";
import { SourceLink } from "@/components/source-link";
import { countNoun, formatAgeDays } from "@/lib/format";
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

function columnSort(column: "handle" | "gc" | "posts", sort: SortKey): "ascending" | "descending" | "none" {
  if (column === "gc" && sort === "gc-desc") return "descending";
  if (column === "gc" && sort === "gc-asc") return "ascending";
  if (column === "posts" && sort === "posts") return "descending";
  if (column === "handle" && sort === "handle") return "ascending";
  return "none";
}

export function AccountsBoard({ rows }: { rows: AccountRow[] }) {
  const [sort, setSort] = useState<SortKey>("gc-desc");
  const label = SORTS.find((item) => item.id === sort)?.label ?? "GC score high";
  const ordered = useMemo(() => {
    const next = [...rows];
    next.sort((a, b) => {
      if (sort === "gc-asc") {
        const g = Number(b.graded) - Number(a.graded);
        if (g) return g;
        return a.gcScore - b.gcScore || compareText(a.handle, b.handle);
      }
      if (sort === "posts") {
        const g = Number(b.graded) - Number(a.graded);
        if (g) return g;
        return b.postCount - a.postCount || b.gcScore - a.gcScore || compareText(a.handle, b.handle);
      }
      if (sort === "handle") return compareText(a.handle, b.handle);
      const g = Number(b.graded) - Number(a.graded);
      if (g) return g;
      return b.gcScore - a.gcScore || compareText(a.handle, b.handle);
    });
    return next;
  }, [rows, sort]);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft">Accounts sorted by {label}</p>
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
          <caption className="sr-only">Accounts sorted by {label}</caption>
          <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2 font-medium" aria-sort={columnSort("handle", sort)}>Account</th>
              <th className="px-3 py-2 font-medium" aria-sort={columnSort("gc", sort)}>GC score</th>
              <th className="px-3 py-2 font-medium" aria-sort={columnSort("posts", sort)}>Posts</th>
              <th className="px-3 py-2 font-medium" aria-sort="none">Source</th>
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
                  <SourceLink href={account.sourceUrl} handle={account.handle} />
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
      <p className="font-mono text-xs text-ink-soft">{countNoun(account.postCount, "post")} in window</p>
      <SourceLink href={account.sourceUrl} handle={account.handle} />
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

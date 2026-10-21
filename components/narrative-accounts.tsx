"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LabelBadge } from "@/components/label-badge";
import type { AccountLabel } from "@/lib/types";

const PREVIEW_ROWS = 8;

export type NarrativeAccountRow = {
  handle: string;
  label: AccountLabel;
  postCount: number;
  clonePostCount: number;
  graded: boolean;
  cloneScore: number;
  ageDays: number | null;
  followers: number;
};

export function NarrativeAccounts({
  accounts,
  title,
}: {
  accounts: NarrativeAccountRow[];
  title: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const expanded = useRef(false);
  useEffect(() => {
    // The button unmounts on expand: hand focus to the first newly shown row.
    if (!showAll || !expanded.current) return;
    bodyRef.current?.querySelectorAll<HTMLAnchorElement>("tr a")[PREVIEW_ROWS]?.focus();
  }, [showAll]);
  const visible = showAll ? accounts : accounts.slice(0, PREVIEW_ROWS);
  const capped = accounts.length > PREVIEW_ROWS;

  return (
    <div className="max-w-full min-w-0">
      <table className="narrative-accounts">
        <caption className="sr-only">Accounts behind {title}</caption>
        <thead>
          <tr>
            <th>Account</th>
            <th>Label</th>
            <th>Posts</th>
            <th>Copied</th>
            <th>Copy score</th>
            <th>Account age</th>
            <th>Followers</th>
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {visible.map((account) => (
            <tr key={account.handle}>
              <td data-l="Account">
                <Link href={`/accounts/${account.handle}`} className="cite-link tap">
                  @{account.handle}
                </Link>
              </td>
              <td data-l="Label">
                <LabelBadge label={account.label} />
              </td>
              <td data-l="Posts">{account.postCount}</td>
              <td data-l="Copied">{account.clonePostCount}</td>
              <td data-l="Copy score">
                {account.graded ? account.cloneScore : <span className="text-ink-soft">thin sample</span>}
              </td>
              <td data-l="Account age">{account.ageDays === null ? "—" : `${account.ageDays} d`}</td>
              <td data-l="Followers">{account.followers.toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {capped && !showAll ? (
        <button type="button" className="narrative-show-all" onClick={() => {
            expanded.current = true;
            setShowAll(true);
          }}>
          Show all {accounts.length}
        </button>
      ) : null}
    </div>
  );
}

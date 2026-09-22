import Link from "next/link";
import { AgeBadge, LabelBadge } from "@/components/label-badge";
import { NarrativeGraph } from "@/components/narrative-graph";
import { NewAccountChart, type NewAccountRow } from "@/components/new-account-chart";
import { VolumeChart, type VolumeRow } from "@/components/volume-chart";
import { getCorpus, getReport } from "@/lib/corpus";
import { excerpt, formatAgeDays, formatStamp } from "@/lib/format";
import { AGE_AS_OF } from "@/lib/thresholds";

export default function DashboardPage() {
  const report = getReport();
  const corpus = getCorpus();
  const order = new Map(corpus.narratives.map((narrative, index) => [narrative.id, index]));
  const graphNodes = [...report.narratives].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
  const titles = new Map(report.narratives.map((narrative) => [narrative.id, narrative.title]));
  const chartRows: VolumeRow[] = report.narratives.map((narrative) => ({
    shortLabel: `${narrative.shortLabel} (${narrative.postCount})`,
    title: narrative.title,
    topic: narrative.topic,
    postCount: narrative.postCount,
    accountCount: narrative.accountCount,
    originPosts: narrative.originPosts,
    clonePosts: narrative.clonePosts,
    boostPosts: narrative.boostPosts,
    otherPosts: narrative.otherPosts,
    freshPosts: narrative.age.freshPostCount,
    underYearPosts: narrative.age.underYearPostCount,
    freshVolumePct: narrative.age.freshVolumePct,
    underYearVolumePct: narrative.age.underYearVolumePct,
  }));
  const newAccountRows: NewAccountRow[] = [...report.narratives]
    .sort(
      (a, b) =>
        b.age.underYearPostCount - a.age.underYearPostCount ||
        b.age.freshPostCount - a.age.freshPostCount ||
        a.title.localeCompare(b.title),
    )
    .map((narrative) => ({
      shortLabel: `${narrative.shortLabel} (${narrative.age.underYearPostCount})`,
      title: narrative.title,
      topic: narrative.topic,
      freshPosts: narrative.age.freshPostCount,
      youngPosts: narrative.age.youngPostCount,
      underYearPosts: narrative.age.underYearPostCount,
      postCount: narrative.postCount,
      freshVolumePct: narrative.age.freshVolumePct,
      underYearVolumePct: narrative.age.underYearVolumePct,
      freshBoostPosts: narrative.freshBoostPosts,
      underYearBoostPosts: narrative.underYearBoostPosts,
      freshAccountsDominate: narrative.age.freshAccountsDominate,
      newAccountsDominate: narrative.age.newAccountsDominate,
    }));
  const maxPosts = Math.max(...report.narratives.map((narrative) => narrative.postCount));
  const amplifiers = report.accounts
    .filter((account) => account.label === "Amplifier" || account.label === "Clone+Amp")
    .sort(
      (a, b) =>
        b.ampScore - a.ampScore || b.boostPostCount - a.boostPostCount || a.handle.localeCompare(b.handle),
    );

  return (
    <div className="grid min-w-0 gap-12">
      <section className="max-w-3xl">
        <p className="kicker">Field notebook 00</p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink md:text-4xl">
          Which narratives are being sewn, and who is copying the language.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          Two signals, kept apart. <strong className="font-medium text-ink">Clone speech</strong> is the same or
          near-same wording posted as an original, not a retweet. <strong className="font-medium text-ink">Amplifiers</strong>{" "}
          boost a narrative without being the source. An account can be either, both, or neither. The scores are
          never added into one number. A third flag, also kept off both grades, marks volume from accounts under 30
          days and under 1 year. Those ages are fixture dates measured at {formatStamp(AGE_AS_OF)}, not a live lookup.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          This page is a {report.totals.postCount}-post synthetic corpus across {report.totals.narrativeCount}{" "}
          narratives. It does not call X. Paste a duplicate on the{" "}
          <Link href="/paste" className="underline decoration-rule underline-offset-4 hover:decoration-ink">
            paste bench
          </Link>{" "}
          to see the same rules fire.
        </p>
      </section>

      <dl className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
        <Stat label="Narratives" value={String(report.totals.narrativeCount)} />
        <Stat label="Posts" value={String(report.totals.postCount)} />
        <Stat label="Clone clusters" value={String(report.totals.clusterCount)} />
        <Stat label="Amplifier accounts" value={String(report.totals.amplifierAccountCount)} />
      </dl>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">Figure 1</p>
            <h2 className="mt-1 font-serif text-2xl text-ink">Narrative volume</h2>
          </div>
          <ul className="flex flex-wrap gap-3 text-xs text-ink-soft">
            <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 bg-origin" /> Originator</li>
            <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 bg-vermilion" /> Clone speech</li>
            <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 bg-lab" /> Amplifier</li>
            <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 bg-other" /> Other notes</li>
          </ul>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">
          Bar length is post count. Longer bars are narratives being sewn harder in this corpus. The number at the
          end of each bar is the total.
        </p>
        <VolumeChart rows={chartRows} />
        <div className="max-w-full overflow-x-auto border border-rule">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <caption className="sr-only">Narrative volume, sorted by post count</caption>
            <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2 font-medium">Narrative</th>
                <th className="px-3 py-2 font-medium">Volume</th>
                <th className="px-3 py-2 font-medium">Posts</th>
                <th className="px-3 py-2 font-medium">Accounts</th>
                <th className="px-3 py-2 font-medium">Under 30d</th>
                <th className="px-3 py-2 font-medium">Under 1y</th>
                <th className="px-3 py-2 font-medium">First seen</th>
              </tr>
            </thead>
            <tbody>
              {report.narratives.map((narrative) => (
                <tr
                  key={narrative.id}
                  className={
                    narrative.age.freshAccountsDominate
                      ? "border-t border-rule bg-fresh-soft/70"
                      : narrative.age.newAccountsDominate
                        ? "border-t border-rule bg-yearling-soft/80"
                        : "border-t border-rule"
                  }
                >
                  <td className="px-3 py-2">
                    <p className="font-serif text-base text-ink">{narrative.title}</p>
                    <p className="text-xs text-ink-soft">{narrative.topic}</p>
                    {narrative.age.newAccountsDominate ? (
                      <p className={`text-xs ${narrative.age.freshAccountsDominate ? "text-fresh" : "text-yearling"}`}>
                        {narrative.age.freshAccountsDominate
                          ? "Sewn by accounts under 30 days"
                          : "Sewn by accounts under 1 year"}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-2.5 w-40 bg-rule/70" aria-hidden="true">
                      <div
                        className="h-full bg-vermilion"
                        style={{ width: `${(narrative.postCount / maxPosts) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono">{narrative.postCount}</td>
                  <td className="px-3 py-2 font-mono">{narrative.accountCount}</td>
                  <td className="px-3 py-2 font-mono">{narrative.age.freshVolumePct}%</td>
                  <td className="px-3 py-2 font-mono">{narrative.age.underYearVolumePct}%</td>
                  <td className="px-3 py-2">
                    {narrative.originAccount ? (
                      <Link href={`/accounts/${narrative.originAccount}`} className="underline decoration-rule">
                        @{narrative.originAccount}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {narrative.firstSeen ? (
                      <span className="mt-0.5 block text-xs text-ink-soft">{formatStamp(narrative.firstSeen)}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">Figure 1b</p>
            <h2 className="mt-1 font-serif text-2xl text-ink">Narratives sewn by new accounts</h2>
          </div>
          <ul className="flex flex-wrap gap-3 text-xs text-ink-soft">
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 bg-fresh" /> Under 30 days
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 bg-yearling" /> 30 days to 1 year
            </li>
          </ul>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">
          Bar length is posts from accounts younger than one year, which includes the under-30-day band.{" "}
          {report.totals.newAccountNarrativeCount} narratives are highlighted because new accounts supply at least half
          their posts. {report.totals.freshPostCount} posts in the corpus come from accounts under 30 days, and{" "}
          {report.totals.underYearPostCount} from accounts under 1 year. Age is a flag beside the grades, not a term
          inside them.
        </p>
        <NewAccountChart rows={newAccountRows} />
      </section>

      <section className="grid gap-4">
        <div>
          <p className="kicker">Figure 2</p>
          <h2 className="mt-1 font-serif text-2xl text-ink">Shared-account graph</h2>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-soft">
          Node area tracks volume. A line means at least two accounts posted in both narratives, which is a hint that
          the same voices are sewing those frames together. It is not proof of coordination. A ring means new accounts
          are at least half of that narrative: berry for under 30 days, ochre when the broader under-1-year band is the
          one that crosses half.
        </p>
        <ul className="flex flex-wrap gap-4 text-xs text-ink-soft">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-fresh" /> Under 30 days dominate
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-yearling" /> Under 1 year dominates
          </li>
        </ul>
        <div className="overflow-hidden border border-rule bg-paper-raised p-3">
          <NarrativeGraph nodes={graphNodes} edges={report.edges} />
        </div>
      </section>

      <div className="grid min-w-0 gap-10 lg:grid-cols-2">
        <section>
          <p className="kicker">Clone speech</p>
          <h2 className="mt-1 font-serif text-2xl text-ink">Language clusters</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Each row is reused wording. The first account in time is the originator, not a clone. A row is highlighted
            when accounts under 1 year wrote at least half of its posts.
          </p>
          <ol className="mt-4 divide-y divide-rule border-y border-rule">
            {report.clusters.map((cluster) => (
              <li key={cluster.id}>
                <Link
                  href={`/clusters/${cluster.id}`}
                  className={`block py-4 hover:bg-paper-raised ${
                    cluster.age.freshAccountsDominate
                      ? "bg-fresh-soft/70"
                      : cluster.age.newAccountsDominate
                        ? "bg-yearling-soft/80"
                        : ""
                  }`}
                >
                  <p className="font-serif text-lg leading-snug text-ink">{excerpt(cluster.sampleText, 140)}</p>
                  <p className="mt-2 text-sm text-ink-soft">
                    {cluster.narrativeId ? titles.get(cluster.narrativeId) : "Unassigned"} · first seen{" "}
                    <span className="text-ink">@{cluster.originAccount}</span> · {formatStamp(cluster.originAt)}
                  </p>
                  <p className="mt-2 font-mono text-xs text-ink">
                    {cluster.cloneCount} copies · {cluster.exactCount} exact · {cluster.nearCount} near ·{" "}
                    {cluster.templateCount} template
                  </p>
                  <p
                    className={`mt-1 font-mono text-xs ${
                      cluster.age.freshAccountsDominate
                        ? "text-fresh"
                        : cluster.age.newAccountsDominate
                          ? "text-yearling"
                          : "text-ink-soft"
                    }`}
                  >
                    {cluster.age.newAccountsDominate ? "New accounts dominate · " : ""}
                    {cluster.age.freshVolumePct}% under 30 days · {cluster.age.underYearVolumePct}% under 1 year
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <p className="kicker">Amplifiers</p>
          <h2 className="mt-1 font-serif text-2xl text-ink">Leaderboard</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Sorted by amplifier grade only. Follower count is shown and ignored. A new-account badge sits beside the
            grade when the amplifier is under 30 days or under 1 year. The badge does not change the grade.
            High-follower clone accounts are not on this list unless they also boost without copying.
          </p>
          <div className="mt-4 max-w-full overflow-x-auto border border-rule">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Amplifier leaderboard</caption>
              <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Amp</th>
                  <th className="px-3 py-2 font-medium">Clone</th>
                  <th className="px-3 py-2 font-medium">Age</th>
                  <th className="px-3 py-2 font-medium">Followers</th>
                </tr>
              </thead>
              <tbody>
                {amplifiers.map((account) => (
                  <tr key={account.handle} className="border-t border-rule">
                    <td className="px-3 py-2">
                      <Link href={`/accounts/${account.handle}`} className="underline decoration-rule">
                        @{account.handle}
                      </Link>
                      <span className="mt-1 block">
                        <LabelBadge label={account.label} />
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-lab">{account.ampScore}</td>
                    <td className="px-3 py-2 font-mono text-vermilion">{account.cloneScore}</td>
                    <td className="px-3 py-2">
                      <AgeBadge band={account.ageBand} showEstablished />
                      <span className="mt-1 block font-mono text-xs text-ink-soft">{formatAgeDays(account.ageDays)}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-ink-soft">{account.followers.toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper px-4 py-3">
      <dt className="kicker">{label}</dt>
      <dd className="mt-1 font-serif text-3xl text-ink">{value}</dd>
    </div>
  );
}

import Link from "next/link";
import { GcScale } from "@/components/gc-scale";
import { LabelBadge } from "@/components/label-badge";
import { compareNarrativesByCopycat, copycatShare } from "@/lib/board";
import {
  countNoun,
  eachUtcDay,
  etDay,
  formatEtStamp,
  formatMonthDay,
  formatWindowLabel,
} from "@/lib/format";
import { compareText } from "@/lib/order";
import { newAccountReposterPct } from "@/lib/reposters";
import type { AccountReport, AnnotatedPost, CloneCluster, NarrativeVolume, Report } from "@/lib/types";

const QUOTE_LIMIT = 220;

export function NarrativeBoard({ report }: { report: Report }) {
  const days = eachUtcDay(report.clock.start, report.clock.end);
  const byDay = new Map<string, number>();
  for (const post of report.posts) {
    if (!post.narrativeId) continue;
    const key = `${post.narrativeId}|${etDay(post.postedAt)}`;
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const postsById = new Map(report.posts.map((post) => [post.id, post]));
  const narratives = [...report.narratives].sort(compareNarrativesByCopycat);
  const windowLabel = formatWindowLabel(report.clock.start, report.clock.end);

  return (
    <div className="grid min-w-0 gap-6">
      <section className="max-w-3xl">
        <p className="kicker">Narrative watch</p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink md:text-4xl">
          Which narratives look pushed, not grown?
        </h1>
        <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-lab">
          Each card is one narrative: how fast it is spreading, how much of it is copied wording, and who is pushing
          it. Open a card&apos;s account list to see the evidence.
        </p>
      </section>

      <dl className="narrative-totals">
        <div>
          <b>{report.totals.postCount}</b> posts
        </div>
        <div>
          <b>{report.totals.narrativeCount}</b> narratives
        </div>
        <div>
          <b>{report.accounts.length}</b> accounts
        </div>
        <div>
          <b>{report.totals.clusterCount}</b> copy clusters
        </div>
        <div>
          <b>{report.totals.clonePostCount}</b> copied posts
        </div>
        <div>Window {windowLabel}</div>
      </dl>

      <div className="narrative-grid">
        {narratives.map((narrative) => (
          <NarrativeCard
            key={narrative.id}
            narrative={narrative}
            days={days}
            counts={days.map((day) => byDay.get(`${narrative.id}|${day}`) ?? 0)}
            clusters={report.clusters.filter((cluster) => cluster.narrativeId === narrative.id)}
            postsById={postsById}
            posts={report.posts}
            accounts={report.accounts.filter((account) => account.narrativeIds.includes(narrative.id))}
          />
        ))}
      </div>

      <p className="text-xs leading-relaxed text-ink-soft">
        Reposter ages come from a sample of up to 50 reposters per seed post, measured against the latest post in the
        file ({report.clock.asOf.slice(0, 10)}). The narrative GC Scale reads Not graded yet: there is no
        narrative-level amplification grade, and the Amplifier label needs booster timelines that are not collected
        here.
      </p>
    </div>
  );
}

function NarrativeCard({
  narrative,
  days,
  counts,
  clusters,
  postsById,
  posts,
  accounts,
}: {
  narrative: NarrativeVolume;
  days: string[];
  counts: number[];
  clusters: CloneCluster[];
  postsById: Map<string, AnnotatedPost>;
  posts: AnnotatedPost[];
  accounts: AccountReport[];
}) {
  const share = Math.round(copycatShare(narrative) * 100);
  const rankedClusters = [...clusters]
    .sort((a, b) => b.cloneCount - a.cloneCount || compareText(a.originAt, b.originAt))
    .slice(0, 3);
  const originals = posts
    .filter((post) => post.narrativeId === narrative.id && post.action === "post")
    .sort((a, b) => compareText(b.postedAt, a.postedAt) || compareText(b.id, a.id))
    .slice(0, 2);
  const rankedAccounts = [...accounts].sort(
    (a, b) => b.clonePostCount - a.clonePostCount || b.postCount - a.postCount || compareText(a.handle, b.handle),
  );
  const last = counts.slice(-7);
  const prev = counts.slice(-14, -7);
  const lastDays = days.slice(-7);
  const prevDays = days.slice(-14, -7);

  return (
    <article id={narrative.id} className="narrative-card">
      <header>
        <p className="font-mono text-xs tracking-wide text-ink-soft">
          <span className="kicker">{narrative.topic}</span>
          {" · earliest originator "}
          {narrative.originAccount ? (
            <Link href={`/accounts/${narrative.originAccount}`} className="cite-link tap normal-case">
              @{narrative.originAccount}
            </Link>
          ) : (
            "—"
          )}
        </p>
        <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">{narrative.title}</h2>
        <p className="m-0 text-sm leading-relaxed text-lab">{narrative.summary}</p>
      </header>

      <section>
        <h3 className="narrative-h">Spread · posts per day</h3>
        <Sparkline counts={counts} start={days[0] ?? ""} end={days.at(-1) ?? ""} />
        <p className="mt-1.5 text-sm text-lab">
          {sum(last)} posts {dayRange(lastDays)} vs {sum(prev)} {dayRange(prevDays)}
        </p>
      </section>

      <dl className="narrative-stats">
        <div>
          <dt>Copycat share</dt>
          <dd>
            {share}%<small>{narrative.clonePosts} of {narrative.postCount} posts</small>
          </dd>
        </div>
        <ReposterStat narrative={narrative} />
        <div>
          <dt>Accounts pushing</dt>
          <dd>
            {narrative.accountCount}
            <small>{narrative.cloneAccountCount} copied wording</small>
          </dd>
        </div>
        <div>
          <dt>New accounts (&lt;1 yr)</dt>
          <dd>
            {narrative.age.underYearVolumePct}%<small>of post volume</small>
          </dd>
        </div>
      </dl>

      <section>
        <h3 className="narrative-h">Amplification</h3>
        <GcScale score="withheld" label="GC Scale" graded={false} />
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
          No narrative-level amplification grade exists in GCBot yet.
        </p>
      </section>

      <section>
        <h3 className="narrative-h">
          {rankedClusters.length > 0 ? "Most-copied wording" : "No copied wording detected · latest original posts"}
        </h3>
        <ol className="grid list-none gap-2.5 p-0">
          {rankedClusters.length > 0
            ? rankedClusters.map((cluster) => (
                <li key={cluster.id}>
                  <blockquote className="narrative-quote">{clip(cluster.sampleText)}</blockquote>
                  <p className="cite">
                    {cluster.originAccount ? (
                      <Link href={`/accounts/${cluster.originAccount}`} className="cite-link tap">
                        @{cluster.originAccount}
                      </Link>
                    ) : (
                      "Source outside corpus"
                    )}
                    {" · "}
                    {formatEtStamp(cluster.originAt)}
                    {" · "}
                    <b className="text-ink">{countNoun(cluster.cloneCount, "copy", "copies")}</b>
                    {` across ${countNoun(cluster.accounts.length, "account")}`}
                    <SourceLink url={postsById.get(cluster.originPostId)?.url} />
                  </p>
                </li>
              ))
            : originals.map((post) => (
                <li key={post.id}>
                  <blockquote className="narrative-quote">{clip(post.text)}</blockquote>
                  <p className="cite">
                    <Link href={`/accounts/${post.account}`} className="cite-link tap">
                      @{post.account}
                    </Link>
                    {" · "}
                    {formatEtStamp(post.postedAt)}
                    <SourceLink url={post.url} />
                  </p>
                </li>
              ))}
        </ol>
      </section>

      <details className="narrative-details">
        <summary>Accounts behind this narrative ({rankedAccounts.length})</summary>
        <div className="max-w-full min-w-0">
          <table className="narrative-accounts">
            <caption className="sr-only">Accounts behind {narrative.title}</caption>
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
            <tbody>
              {rankedAccounts.map((account) => (
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
        </div>
      </details>
    </article>
  );
}

function ReposterStat({ narrative }: { narrative: NarrativeVolume }) {
  const sample = narrative.reposters;
  if (!sample) {
    return (
      <div>
        <dt>New-account reposters</dt>
        <dd className="text-ink-soft">
          —<small>reposters not captured</small>
        </dd>
      </div>
    );
  }
  return (
    <div>
      <dt>New-account reposters</dt>
      <dd>
        {newAccountReposterPct(sample)}%
        <small>
          {sample.under1y} of {sample.reposters} sampled reposters &lt;1 yr old · {sample.under30d} &lt;30 d
        </small>
      </dd>
    </div>
  );
}

function SourceLink({ url }: { url: string | undefined }) {
  if (!url) return null;
  return (
    <>
      {" · "}
      <a href={url} className="cite-link tap" rel="noopener noreferrer">
        source
      </a>
    </>
  );
}

function Sparkline({ counts, start, end }: { counts: number[]; start: string; end: string }) {
  const width = 300;
  const height = 56;
  const peakValue = counts.reduce((max, value) => (value > max ? value : max), 0);
  const scale = peakValue || 1;
  const peakIndex = counts.indexOf(peakValue);
  const points = counts
    .map((value, index) => {
      const x = counts.length <= 1 ? 0 : (index * width) / (counts.length - 1);
      const y = height - 4 - (value / scale) * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  const startLabel = start ? formatMonthDay(start) : "";
  const endLabel = end ? formatMonthDay(end) : "";
  const peakLabel = daysLabel(counts, peakIndex, start);

  return (
    <>
      <svg
        className="spark"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Posts per day ${startLabel} to ${endLabel}: ${counts.join(", ")}`}
      >
        <polygon points={area} fill="rgba(235,101,5,.14)" />
        <polyline
          points={points}
          fill="none"
          stroke="#eb6505"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between gap-2 font-mono text-xs text-ink-soft">
        <span>{startLabel}</span>
        <span>
          peak {peakValue}/day · {peakLabel}
        </span>
        <span>{endLabel}</span>
      </div>
    </>
  );
}

function daysLabel(counts: number[], index: number, start: string): string {
  if (!start || counts.length === 0) return "";
  const cursor = new Date(`${start}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() + index);
  return formatMonthDay(cursor.toISOString().slice(0, 10));
}

function dayRange(days: string[]): string {
  if (days.length === 0) return "—";
  const first = days[0];
  const last = days[days.length - 1];
  if (first === last) return formatMonthDay(first);
  if (first.slice(0, 7) === last.slice(0, 7)) return `${formatMonthDay(first)}–${Number(last.slice(8, 10))}`;
  return `${formatMonthDay(first)}–${formatMonthDay(last)}`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function clip(text: string): string {
  if (text.length <= QUOTE_LIMIT) return text;
  return `${text.slice(0, QUOTE_LIMIT)}…`;
}

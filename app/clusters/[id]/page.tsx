import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgeCallout } from "@/components/age-share";
import { DiffView } from "@/components/diff-view";
import { AgeBadge, RoleBadge } from "@/components/label-badge";
import { getReport } from "@/lib/corpus";
import { wordDiff } from "@/lib/diff";
import { excerpt, formatAgeDays, formatLatency, formatStamp } from "@/lib/format";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getReport().clusters.map((cluster) => ({ id: cluster.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const cluster = getReport().clusters.find((item) => item.id === id);
  if (!cluster) return { title: "Cluster" };
  return { title: excerpt(cluster.sampleText, 72) };
}

export default async function ClusterPage({ params }: PageProps) {
  const { id } = await params;
  const report = getReport();
  const cluster = report.clusters.find((item) => item.id === id);
  if (!cluster) notFound();

  const narrative = report.narratives.find((item) => item.id === cluster.narrativeId);
  const origin = cluster.posts[0];
  const copies = cluster.posts.slice(1);
  const amplifiers = report.posts.filter(
    (post) =>
      post.isBoost &&
      cluster.narrativeId !== null &&
      (post.narrativeId === cluster.narrativeId || post.frameNarrativeIds.includes(cluster.narrativeId)),
  );

  return (
    <article className="grid gap-8">
      <div>
        <p className="kicker">
          <Link href="/" className="tap underline decoration-rule underline-offset-4">
            Dashboard
          </Link>{" "}
          / copied language
        </p>
        <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-ink">{cluster.sampleText}</h1>
        <p className="mt-4 text-sm text-ink-soft">
          {narrative ? narrative.title : "No narrative tag"} · {cluster.cloneCount} copies ·{" "}
          {cluster.accounts.length} accounts
        </p>
        <div className="mt-4 max-w-3xl">
          <AgeCallout age={cluster.age} scope="cluster" />
        </div>
      </div>

      <section className="grid gap-4 border border-rule bg-paper-raised p-4 md:grid-cols-3">
        <div>
          <p className="kicker">Originator</p>
          <p className="mt-2 font-serif text-xl">
            <Link href={`/accounts/${cluster.originAccount}`} className="tap underline decoration-rule">
              @{cluster.originAccount}
            </Link>
          </p>
          <p className="mt-1 text-sm text-ink-soft">{formatStamp(cluster.originAt)}</p>
        </div>
        <div>
          <p className="kicker">Match mix</p>
          <p className="mt-2 font-mono text-sm">
            {cluster.exactCount} exact · {cluster.nearCount} near · {cluster.templateCount} template
          </p>
        </div>
        <div>
          <p className="kicker">Follows inside the set</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {cluster.mutualFollows.length === 0
              ? "No mutual follows. That is a coordination hint, not proof."
              : cluster.mutualFollows.map((link) => `@${link.from} ↔ @${link.to}`).join("; ")}
          </p>
          {cluster.oneWayFollows.length > 0 ? (
            <p className="mt-2 text-xs text-ink-soft">
              One-way: {cluster.oneWayFollows.map((link) => `@${link.from} → @${link.to}`).join(", ")}
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl text-ink">Timeline</h2>
        <div className="mt-4 max-w-full min-w-0 overflow-x-auto border border-rule">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Account age</th>
                <th className="px-3 py-2 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {cluster.posts.map((post) => (
                <tr key={post.id} className="border-t border-rule">
                  <td className="px-3 py-2 whitespace-nowrap">{formatStamp(post.postedAt)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/accounts/${post.account}`} className="tap underline decoration-rule">
                      @{post.account}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <RoleBadge role={post.role} />
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <AgeBadge band={post.ageBand} showEstablished showUnknown />
                      <span className="font-mono text-xs text-ink-soft">{formatAgeDays(post.ageDays)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-soft">
                    {post.latencyMs === null ? "First seen" : formatLatency(post.latencyMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6">
        <div>
          <h2 className="font-serif text-2xl text-ink">Text diffs</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Diffs compare normalized text: lowercase, with URLs, @handles, cashtags, emoji, and extra whitespace
            removed. Struck words were in the originator post. Orange words appear only in the copy.
          </p>
        </div>
        {copies.map((copy) => (
          <div key={copy.id} className="border border-rule bg-paper-raised p-4">
            <div className="tap-row">
              <Link href={`/accounts/${copy.account}`} className="tap font-serif text-lg underline decoration-rule">
                @{copy.account}
              </Link>
              <RoleBadge role={copy.role} />
              <AgeBadge band={copy.ageBand} showEstablished showUnknown />
              <span className="font-mono text-xs text-ink-soft">
                Jaccard {copy.jaccard.toFixed(2)} · {copy.sharedFourGrams} shared 4-grams
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink">{copy.text}</p>
            <div className="mt-3 border-t border-rule pt-3">
              <DiffView ops={wordDiff(origin.normalized, copy.normalized)} />
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-serif text-2xl text-ink">Boosts on this narrative</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          These posts reuse the frame or quote it. They are not in the copied-language cluster unless their wording also
          matched. The lists stay separate on purpose. This is the boost list, not an organic-reach ranking.
        </p>
        {amplifiers.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">No boost posts on this narrative.</p>
        ) : (
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {amplifiers.map((post) => (
              <li key={post.id} className="py-3">
                <p className="tap-row text-sm">
                  <Link href={`/accounts/${post.account}`} className="tap underline decoration-rule">
                    @{post.account}
                  </Link>
                  <span className="text-ink-soft">
                    {post.action} · {formatStamp(post.postedAt)}
                  </span>{" "}
                  <AgeBadge band={post.ageBand} showEstablished showUnknown />
                  {post.ageDays !== null ? (
                    <span className="font-mono text-xs text-ink-soft"> {formatAgeDays(post.ageDays)}</span>
                  ) : null}
                </p>
                <p className="mt-1 text-ink">{post.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

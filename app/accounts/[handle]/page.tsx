import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgeBadge, LabelBadge, RoleBadge } from "@/components/label-badge";
import { HeadlineScale } from "@/components/headline-scale";
import { detectorSignal } from "@/components/gc-scale";
import { AMPLIFIER_NOT_AVAILABLE_SENTENCE } from "@/components/organic-reach-copy";
import { ScoreMeter } from "@/components/score-meter";
import { SourceLink } from "@/components/source-link";
import { getReport } from "@/lib/corpus";
import { accountSourceUrl, countNoun, displayPostText, excerpt, formatAgeDays, formatStamp } from "@/lib/format";
import { NO_POSTS_LINE, THIN_SAMPLE_LINE } from "@/lib/sample-copy";
import { routeCanonical, routeOpenGraph, shareOpenGraph } from "@/lib/site-urls";
import { THRESHOLDS } from "@/lib/thresholds";

type PageProps = {
  params: Promise<{ handle: string }>;
};

export function generateStaticParams() {
  return getReport().accounts.map((account) => ({ handle: account.handle }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const account = getReport().accounts.find((item) => item.handle === handle);
  if (!account) return { title: { absolute: "Page not found · GCBot" }, openGraph: shareOpenGraph() };
  const path = `/accounts/${encodeURIComponent(handle)}`;
  return { title: `@${handle}`, alternates: routeCanonical(path), openGraph: routeOpenGraph(path) };
}

const DEFAULT_BIO = /just a guy|thoughts are my own|market observer/i;

export default async function AccountPage({ params }: PageProps) {
  const { handle } = await params;
  const report = getReport();
  const account = report.accounts.find((item) => item.handle === handle);
  if (!account) notFound();

  const posts = report.posts.filter((post) => post.account === handle);
  const narratives = report.narratives.filter((narrative) => account.narrativeIds.includes(narrative.id));

  return (
    <article className="grid gap-8">
      <div>
        <p className="kicker">
          <Link href="/" className="tap underline decoration-rule underline-offset-4">
            Dashboard
          </Link>{" "}
          / account
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink">@{account.handle}</h1>
        <p className="account-label mt-3 flex flex-wrap items-center gap-2">
          <LabelBadge label={account.label} />
          <AgeBadge band={account.ageBand} showEstablished showUnknown />
        </p>
        <p className="mt-2 text-ink-soft">{account.name}</p>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed">{account.bio}</p>
        {DEFAULT_BIO.test(account.bio) ? (
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Soft feature only: this bio resembles a default template. It is not an input to either grade.
          </p>
        ) : null}
      </div>

      <p className="text-sm text-ink-soft">
        <SourceLink href={accountSourceUrl(account.handle, posts)} handle={account.handle} />
      </p>

      <HeadlineScale account={account} />

      <div className="grid gap-4 md:grid-cols-2">
        <ScoreMeter
          label="Original voice"
          score={account.graded ? account.cloneScore : "withheld"}
          signal={
            account.graded
              ? detectorSignal("clone", account.cloneScore)
              : account.postCount === 0
                ? null
                : THIN_SAMPLE_LINE
          }
          detail={
            account.graded
              ? `${countNoun(account.clonePostCount, "copied post")} and ${countNoun(account.attributedPostCount, "attributed repost")}. Attributed reposts weigh ${THRESHOLDS.cloneAttributedWeight}, under the full copy weights. Higher means more of the voice is original.`
              : account.postCount === 0
                ? `${NO_POSTS_LINE}. This account has no posts in the window, so original voice is withheld.`
                : `${THIN_SAMPLE_LINE}. ${countNoun(account.clonePostCount, "copied post")} and ${countNoun(account.attributedPostCount, "attributed repost")}. Fewer than ${THRESHOLDS.leaderboardMinPosts} posts, so no GC percent is shown.`
          }
        />
        <ScoreMeter
          label="Organic reach"
          score="withheld"
          detail={AMPLIFIER_NOT_AVAILABLE_SENTENCE}
        />
      </div>

      <dl className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
        <Meta label="Posts" value={String(account.postCount)} />
        <Meta label="Active days" value={String(account.activeDays)} />
        <Meta label="Followers, not scored" value={account.followers.toLocaleString("en-US")} />
        <Meta
          label="Age at scan"
          value={account.ageDays === null ? "Unknown" : `${formatAgeDays(account.ageDays)} · ${account.joined || "no date"}`}
        />
      </dl>

      <section>
        <h2 className="font-serif text-2xl">Narratives touched</h2>
        {narratives.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">None in this window.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {narratives.map((narrative) => (
              <li key={narrative.id} className="border border-rule bg-paper-raised px-2 py-1 text-sm">
                {narrative.title}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl">Posts</h2>
        <ol className="mt-4 grid gap-4">
          {posts.map((post) => {
            const narrative = report.narratives.find((item) => item.id === post.narrativeId);
            return (
              <li key={post.id} className="border border-rule bg-paper-raised p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <RoleBadge role={post.role} />
                  {post.isBoost ? (
                    <span className="meta-badge">Boost</span>
                  ) : null}
                  <span className="text-ink-soft">{formatStamp(post.postedAt)}</span>
                  <span className="text-ink-soft">{post.action}</span>
                  {post.textTruncated ? <span className="meta-badge">Truncated text</span> : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed">
                  {displayPostText(post.text, post.textTruncated)}
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  {narrative ? narrative.title : "No narrative tag"}
                  {post.clusterId ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link href={`/clusters/${post.clusterId}`} className="tap underline decoration-rule">
                        {excerpt(
                          report.clusters.find((cluster) => cluster.id === post.clusterId)?.sampleText ?? "cluster",
                          64,
                        )}
                      </Link>
                    </>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper-raised px-4 py-3">
      <dt className="kicker">{label}</dt>
      <dd className="mt-1 font-mono text-lg text-ink">{value}</dd>
    </div>
  );
}

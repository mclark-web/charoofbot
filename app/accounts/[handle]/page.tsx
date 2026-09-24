import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgeBadge, LabelBadge, RoleBadge } from "@/components/label-badge";
import { amplifierScaleScore, detectorSignal } from "@/components/gc-scale";
import { ScoreMeter } from "@/components/score-meter";
import { getReport } from "@/lib/corpus";
import { AGE_AS_OF } from "@/lib/thresholds";
import { excerpt, formatAgeDays, formatStamp } from "@/lib/format";

type PageProps = {
  params: Promise<{ handle: string }>;
};

export function generateStaticParams() {
  return getReport().accounts.map((account) => ({ handle: account.handle }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-4xl text-ink">@{account.handle}</h1>
          <LabelBadge label={account.label} />
          <AgeBadge band={account.ageBand} showEstablished showUnknown />
        </div>
        <p className="mt-2 text-ink-soft">{account.name}</p>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed">{account.bio}</p>
        {DEFAULT_BIO.test(account.bio) ? (
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Soft feature only: this bio resembles a default template. It is not an input to either grade.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ScoreMeter
          label="Original voice"
          score={account.cloneScore}
          signal={detectorSignal("clone", account.cloneScore)}
          detail={`${account.clonePostCount} post${account.clonePostCount === 1 ? "" : "s"} matched earlier language. Exact matches weigh more than near-duplicates and templates. Higher means more of the voice is original.`}
        />
        <ScoreMeter
          label="Organic reach"
          score={amplifierScaleScore(account.boostPostCount, account.ampScore)}
          signal={detectorSignal("amplifier", amplifierScaleScore(account.boostPostCount, account.ampScore))}
          detail={`${account.boostPostCount} boosts on ${account.boostDays} day${account.boostDays === 1 ? "" : "s"}. ${
            account.passesAmpGate
              ? "Passes the persistence gate. Higher means less of the activity is boosting someone else."
              : "Does not pass the gate of 2 boosts on 2 days, so organic reach is withheld."
          }`}
        />
      </div>
      <p className="text-sm text-ink-soft">
        These two GC Scale grades are authenticity. They are computed separately and are not combined. Higher means more authentic, and STRONG means trustworthy. Account age is a third flag, measured at{" "}
        {formatStamp(AGE_AS_OF)} from the fixture created date. It is not added to either grade.
        {account.ageDays === null ? " This handle has no created date, so the age is unknown." : ""}
      </p>

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
          <p className="mt-2 text-sm text-ink-soft">No fixture narrative.</p>
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
                </div>
                <p className="mt-3 leading-relaxed">{post.text}</p>
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

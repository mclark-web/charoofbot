import type { Metadata } from "next";
import { AppealDraft } from "@/components/appeal-draft";
import { formatStamp } from "@/lib/format";
import { AGE_AS_OF, THRESHOLDS } from "@/lib/thresholds";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How the zero-cost GCBot demo detects clone speech and amplifiers, including public thresholds.",
};

const WINDOW_DAYS = THRESHOLDS.clusterWindowHours / 24;

export default function MethodologyPage() {
  return (
    <article className="grid max-w-3xl gap-10">
      <header>
        <p className="kicker">Audit note</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink">Methodology</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          GCBot phase 0 is a proof that clone speech, amplifier behavior, and narrative volume can be shown
          without an API bill. The numbers on this page are the constants the scorer uses.
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">What $0 means here</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-ink">
          <li>No X API key, and no paid firehose. The demo does not ask for one.</li>
          <li>No paid database. The corpus is a JSON file in the repo, scored in memory.</li>
          <li>No paid language model. Matching is normalization, SHA-256, and token overlap.</li>
          <li>
            No X user lookup. Account ages in the demo are <span className="font-mono">accountCreatedAt</span> values
            in the fixture file, measured at {formatStamp(AGE_AS_OF)}. That clock does not move with the wall date.
          </li>
          <li>Hosting can be a Vercel Hobby project. Nothing in the app reads environment variables.</li>
        </ul>
        <p className="leading-relaxed text-ink-soft">
          Two inputs are enough. The bundled fixture corpus is a synthetic FinTwit-style notebook with known
          originators, exact copies, near-duplicates, ticker-swapped skeletons, and accounts that only boost. The
          paste bench runs the same functions in the browser on text you supply.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Two identifiers, never one score</h2>
        <p className="leading-relaxed">
          Clone speech asks whether this post reuses earlier language and presents it as original. Amplifiers ask
          whether an account keeps a narrative in circulation without being the source. A retweet prefix
          (<span className="font-mono">RT @handle:</span>) is neither. It is excluded.
        </p>
        <p className="leading-relaxed">
          Labels are Originator, Clone, Amplifier, Clone+Amp, or Clean. Clone+Amp means both gates passed. It is not
          an average of the two grades.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Normalization</h2>
        <p className="leading-relaxed">
          Text is lowercased. URLs, @handles, cashtags (<span className="font-mono">$TICKER</span>), emoji, and
          punctuation are removed. Remaining whitespace is collapsed. The exact fingerprint is SHA-256 of that
          string, so a copied sentence with a link, a mention, and a rocket emoji still hashes to the originator.
          Cashtag stripping also collapses a skeleton that only swapped tickers.
        </p>
        <p className="leading-relaxed">
          Near-duplicates use token Jaccard on those normalized words. Template matches require at least{" "}
          {THRESHOLDS.templateSharedFourGrams} shared 4-grams and a Jaccard of at least{" "}
          {THRESHOLDS.templateJaccard}, while staying under the near-duplicate line. Posts shorter than{" "}
          {THRESHOLDS.minTokens} tokens are not clustered.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Thresholds</h2>
        <div className="overflow-x-auto border border-rule">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2 font-medium">Rule</th>
                <th className="px-3 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <Row label="Near-duplicate Jaccard" value={`≥ ${THRESHOLDS.nearDupeJaccard}`} />
              <Row label="Template Jaccard" value={`≥ ${THRESHOLDS.templateJaccard} and < ${THRESHOLDS.nearDupeJaccard}`} />
              <Row label="Template shared 4-grams" value={`≥ ${THRESHOLDS.templateSharedFourGrams}`} />
              <Row label="Minimum tokens" value={String(THRESHOLDS.minTokens)} />
              <Row label="Cluster window" value={`${WINDOW_DAYS} days after first seen`} />
              <Row label="Exact / near / template weights" value={`${THRESHOLDS.cloneExactWeight} / ${THRESHOLDS.cloneNearWeight} / ${THRESHOLDS.cloneTemplateWeight}`} />
              <Row label="Clone label" value={`score ≥ ${THRESHOLDS.cloneLabel}`} />
              <Row label="Amplifier label" value={`score ≥ ${THRESHOLDS.ampLabel}, and ≥ ${THRESHOLDS.ampMinBoostPosts} boosts on ≥ ${THRESHOLDS.ampMinBoostDays} days`} />
              <Row label="Fresh account" value={`age < ${THRESHOLDS.freshAccountDays} days`} />
              <Row label="New account" value={`age < ${THRESHOLDS.youngAccountDays} days, which includes fresh`} />
              <Row label="New-account dominance" value={`≥ ${THRESHOLDS.newAccountDominateShare * 100}% of posts in the cluster or narrative`} />
              <Row label="Age clock" value={formatStamp(AGE_AS_OF)} />
            </tbody>
          </table>
        </div>
        <p className="leading-relaxed text-ink-soft">
          Clone score is the sum of match weights, capped at 100. One exact copy is enough to cross the clone label.
          The first post in a cluster is the originator and does not take clone weight.
        </p>
        <p className="leading-relaxed text-ink-soft">
          Amplifier score, when there is at least one boost, is 100 times ({THRESHOLDS.ampBoostWeight} × boost share
          of posts + {THRESHOLDS.ampLoadWeight} × share of posts on a narrative + {THRESHOLDS.ampPersistenceWeight} ×
          boost-days / {THRESHOLDS.persistenceDaysForFull} + {THRESHOLDS.ampOriginalityWeight} × share of posts that
          are not first-seen + {THRESHOLDS.ampVolumeWeight} × boost count / {THRESHOLDS.ampVolumePostsForFull}). Each
          ratio is capped at 1. A boost is a quote, reply, or non-copied slogan on someone else’s narrative. Verbatim
          copies do not count as boosts, which is why a pure clone can sit at amplifier 0.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">New accounts</h2>
        <p className="leading-relaxed">
          The scan records how old each poster is, then asks whether new accounts are sewing the narrative. An account
          under {THRESHOLDS.freshAccountDays} days is fresh. An account under {THRESHOLDS.youngAccountDays} days is new,
          and that band includes the fresh accounts. Both shares are reported: percent of volume from accounts under 30
          days, and percent from accounts under 1 year. A cluster or narrative is highlighted when either share is at
          least {THRESHOLDS.newAccountDominateShare * 100}%. Unknown ages stay in the denominator and out of the
          numerator, so a missing date cannot invent a new account.
        </p>
        <p className="leading-relaxed">
          Fixture ages come from <span className="font-mono">accountCreatedAt</span> on each account in{" "}
          <span className="font-mono">data/corpus.json</span>. They are measured at {formatStamp(AGE_AS_OF)}, the same
          stamp the paste bench uses. The demo does not call the X API, and it does not infer age from follower count
          or bio. Paste a post with <span className="font-mono">accountCreatedAt</span>,{" "}
          <span className="font-mono">createdAt</span>, <span className="font-mono">joined</span>, or{" "}
          <span className="font-mono">ageDays</span> when you know it. Omit the field and the finding is marked age
          unknown. A handle already in the fixture directory keeps the fixture date.
        </p>
        <p className="leading-relaxed">
          The new-account mark is a badge and a volume series. It is not added to the clone speech grade and it is not
          added to the amplifier grade. A fresh amplifier and an established amplifier with the same boost pattern keep
          the same amplifier score. The badge tells you the account is new. The score tells you how it behaved.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">What this does not claim</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>A clone label is reused language. It is not proof of a bot, a payment, or a conspiracy.</li>
          <li>Weak or missing mutual follows inside a cluster are a hint. They are not evidence of coordination.</li>
          <li>
            Follower count and a default-looking bio are shown as context. They are not scored. Account age is flagged
            at the two thresholds above and is not added to either grade.
          </li>
          <li>The corpus is synthetic. It is not a live sample of any real timeline.</li>
          <li>Nothing here is investment advice, a harassment list, or a grade for sale.</li>
        </ul>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">False-positive appeals</h2>
        <p className="leading-relaxed">
          A skeptic should be able to re-run the text. Paste the post, read the hash, and compare it with the cluster
          diff. If the label is wrong, the review queue for a solo operator is manual: one draft, one person, no
          vendor account required for this demo.
        </p>
        <AppealDraft />
      </section>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-rule">
      <th className="px-3 py-2 text-left font-sans font-normal text-ink">{label}</th>
      <td className="px-3 py-2 text-ink">{value}</td>
    </tr>
  );
}

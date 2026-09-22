import type { Metadata } from "next";
import { AppealDraft } from "@/components/appeal-draft";
import { THRESHOLDS } from "@/lib/thresholds";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How the zero-cost Charoof Bot demo detects clone speech and amplifiers, including public thresholds.",
};

const WINDOW_DAYS = THRESHOLDS.clusterWindowHours / 24;

export default function MethodologyPage() {
  return (
    <article className="grid max-w-3xl gap-10">
      <header>
        <p className="kicker">Audit note</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink">Methodology</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          Charoof Bot phase 0 is a proof that clone speech, amplifier behavior, and narrative volume can be shown
          without an API bill. The numbers on this page are the constants the scorer uses.
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">What $0 means here</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-ink">
          <li>No X API key, and no paid firehose. The demo does not ask for one.</li>
          <li>No paid database. The corpus is a JSON file in the repo, scored in memory.</li>
          <li>No paid language model. Matching is normalization, SHA-256, and token overlap.</li>
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
        <h2 className="font-serif text-2xl">What this does not claim</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>A clone label is reused language. It is not proof of a bot, a payment, or a conspiracy.</li>
          <li>Weak or missing mutual follows inside a cluster are a hint. They are not evidence of coordination.</li>
          <li>Follower count, account age, and a default-looking bio are shown as context. They are not scored.</li>
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

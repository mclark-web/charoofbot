import type { Metadata } from "next";
import { AppealDraft } from "@/components/appeal-draft";
import { ORGANIC_REACH_NOT_GRADED, ORGANIC_REACH_RULE } from "@/components/organic-reach-copy";
import { formatStamp } from "@/lib/format";
import { AGE_AS_OF, SCORE_WINDOW, THRESHOLDS } from "@/lib/thresholds";
import { WIRE_OUTLETS } from "@/lib/wires";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How the GC Scale shows authenticity, and the detector signals underneath. Higher means more trustworthy.",
};

const WINDOW_DAYS = THRESHOLDS.clusterWindowHours / 24;

export default function MethodologyPage() {
  return (
    <article className="grid max-w-3xl gap-10">
      <header>
        <p className="kicker">Audit note</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-ink">Methodology</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          GCBot phase 0 shows one headline GC score, with original voice and organic reach underneath, without an API bill.
          Higher on the GC Scale means more authentic, and STRONG means trustworthy. The numbers below are the
          detector constants. Each meter is 100 minus its detector signal. The headline is 100 minus the higher signal.
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">What $0 means here</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed text-ink">
          <li>No X API key, and no paid firehose. The site does not ask for one. Posts were read once with free public X reads and saved to the repo.</li>
          <li>No paid database. The corpus is a JSON file in the repo, scored in memory.</li>
          <li>No paid language model. Matching is normalization, SHA-256, and token overlap.</li>
          <li>
            No live X user lookup. Account ages are each account&apos;s public X created date, stored as{" "}
            <span className="font-mono">accountCreatedAt</span> and measured at {formatStamp(AGE_AS_OF)}. That clock
            does not move with the wall date.
          </li>
          <li>Hosting can be a Vercel Hobby project. Nothing in the app reads environment variables.</li>
        </ul>
        <p className="leading-relaxed text-ink-soft">
          Two inputs are enough. The corpus is real public X posts as of 18 Oct 2026: recent posts from the
          accounts tracked on GradedCalls Sports and FinTwit, plus copies and quote posts of them found by phrase
          search. The paste bench runs the same functions in the browser on text you supply, against a separate
          synthetic practice set with known originators, exact copies, near-duplicates, and accounts that only boost.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">One headline, two readings under it</h2>
        <p className="leading-relaxed">
          The headline GC score is 100 minus the higher of the copy score and the amplifier score. It is not an
          average. STRONG is 70 and above. A flagged account shows that headline first, then original voice and
          organic reach as detail, so a clean meter cannot stand in for the grade.
        </p>
        <p className="leading-relaxed">
          Original voice asks how little of the wording is copied and posted as original. Organic reach asks how
          little of the activity is boosting a narrative without being the source. A retweet prefix
          (<span className="font-mono">RT @handle:</span>) is neither. It is excluded. Higher on each meter means more authentic.
        </p>
        <p className="leading-relaxed">
          The detector still flags Originator, Clone, Amplifier, Clone+Amp, or Clean. Clone+Amp means both detector
          gates passed. Those badges mark the flag. They are not grade pills. The GC Scale is authenticity.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">How the GC Scale is shown</h2>
        <p className="leading-relaxed">
          Display only: authenticity = 100 − detector signal. A graded, finite signal is flipped. Withheld
          organic reach reads {ORGANIC_REACH_NOT_GRADED} Withheld values are never flipped into 100 STRONG. A reading
          above 100 is not graded.
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>70 and above is STRONG. That is the trustworthy band.</li>
          <li>40–69 is PROVISIONAL.</li>
          <li>Above 0 and under 40 is WEAK.</li>
          <li>A graded 0% is EXIT LIQUIDITY.</li>
        </ul>
        <p className="leading-relaxed text-ink-soft">A detector signal of 90 shows 10% WEAK.</p>
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
          {THRESHOLDS.minTokens} tokens are not clustered. A post whose stored text is marked truncated stays out of
          near-duplicate and template matching, because the wording is incomplete. An exact hash can still match.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Thresholds</h2>
        <div className="max-w-full min-w-0 overflow-x-auto border border-rule">
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
              <Row label="Attributed repost weight" value={String(THRESHOLDS.cloneAttributedWeight)} />
              <Row label="Detector clone signal" value={`score ≥ ${THRESHOLDS.cloneLabel} flags copied wording`} />
              <Row label="Best/Worst minimum sample" value={`≥ ${THRESHOLDS.leaderboardMinPosts} posts in the window`} />
              <Row label="Lone template label" value={`needs ≥ ${THRESHOLDS.cloneMinTemplateMatches} template matches, or copied posts ≥ ${THRESHOLDS.cloneShareThreshold * 100}% of the window`} />
              <Row label="Score window" value={`${SCORE_WINDOW.start} through ${SCORE_WINDOW.end}`} />
              <Row label="Detector amplifier signal" value={`score ≥ ${THRESHOLDS.ampLabel}, ≥ ${THRESHOLDS.ampMinBoostPosts} boosts on ≥ ${THRESHOLDS.ampMinBoostDays} days, and ≥ ${THRESHOLDS.ampTimelineBaseline} timeline posts`} />
              <Row label="Fresh account" value={`age < ${THRESHOLDS.freshAccountDays} days`} />
              <Row label="New account" value={`age < ${THRESHOLDS.youngAccountDays} days, which includes fresh`} />
              <Row label="New-account dominance" value={`≥ ${THRESHOLDS.newAccountDominateShare * 100}% of posts in the cluster or narrative`} />
              <Row label="Age clock" value={formatStamp(AGE_AS_OF)} />
            </tbody>
          </table>
        </div>
        <p className="leading-relaxed text-ink-soft">
          The copy score is the sum of match weights, capped at 100. One exact or near copy is enough to cross the clone
          flag. A single template match is {THRESHOLDS.cloneTemplateWeight}, which is over the line of{" "}
          {THRESHOLDS.cloneLabel}, but it does not label the account Clone unless there are at least{" "}
          {THRESHOLDS.cloneMinTemplateMatches} template matches or copied posts are at least{" "}
          {THRESHOLDS.cloneShareThreshold * 100}% of that account&apos;s posts in the window. Explicit credit and
          attributed syndication add {THRESHOLDS.cloneAttributedWeight}. The headline GC score is 100 minus the higher
          of that copy score and the amplifier score. Original voice is 100 minus the copy score alone.
        </p>
        <p className="leading-relaxed text-ink-soft">
          The detector amplifier signal, when there is at least one boost, is 100 times ({THRESHOLDS.ampBoostWeight} × boost share
          of posts + {THRESHOLDS.ampLoadWeight} × share of posts on a narrative + {THRESHOLDS.ampPersistenceWeight} ×
          boost-days / {THRESHOLDS.persistenceDaysForFull} + {THRESHOLDS.ampOriginalityWeight} × share of posts that
          are not first-seen + {THRESHOLDS.ampVolumeWeight} × boost count / {THRESHOLDS.ampVolumePostsForFull}). Each
          ratio is capped at 1. A boost is a short quote with no commentary of its own, a reply, or a non-copied slogan
          on someone else’s narrative. A quote that carries the author’s own commentary is not a boost. Verbatim copies
          do not count as boosts. A tracked lane account is a source and is never scored as a booster of another lane
          account. A pure clone has no boosts, so the detector records amplifier 0 as a skip and organic reach reads Not
          graded yet. {ORGANIC_REACH_RULE} It is not shown as 100 STRONG, as WEAK, or as 0%. When the signal is graded,
          organic reach is 100 minus that signal. Phrase-search and quote-search rows are not a timeline, so they cannot
          supply the {THRESHOLDS.ampTimelineBaseline}-post baseline.
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
          Ages come from <span className="font-mono">accountCreatedAt</span> on each account in{" "}
          <span className="font-mono">data/corpus.json</span>, the public X created date. They are measured at{" "}
          {formatStamp(AGE_AS_OF)}, the same stamp the paste bench uses. The site does not call the X API at
          runtime, and it does not infer age from follower count
          or bio. Paste a post with <span className="font-mono">accountCreatedAt</span>,{" "}
          <span className="font-mono">createdAt</span>, <span className="font-mono">joined</span>, or{" "}
          <span className="font-mono">ageDays</span> when you know it. Omit the field and the finding is marked age
          unknown. A handle already in the practice directory keeps its practice date.
        </p>
        <p className="leading-relaxed">
          The new-account mark is a badge and a volume series. It is not added to original voice and it is not
          added to organic reach. A fresh booster and an established booster with the same boost pattern keep
          the same detector signal, and the same authenticity. The badge tells you the account is new. The GC Scale tells you how authentic the activity looks.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Real-data rules</h2>
        <p className="leading-relaxed">
          The scored file is real public posts as of {formatStamp(AGE_AS_OF)}. These rules keep wire desks and
          credited reposts from reading as clones of language they posted first or marked as someone else’s.
        </p>
        <h3 className="font-serif text-xl">Self-repeats</h3>
        <p className="leading-relaxed">
          A post is compared with earlier posts from other accounts. A match against the same account’s own earlier
          post does not join a copy cluster and does not add copy weight. Repeating your own headline is not cloning.
        </p>
        <h3 className="font-serif text-xl">Originator</h3>
        <p className="leading-relaxed">
          In each copy cluster the earliest post’s account is the Originator. Every post from that account in the
          cluster stays Originator. Later posts of theirs are not scored as copies, including when the wording bounced
          back from someone who picked it up in between.
        </p>
        <h3 className="font-serif text-xl">Attributed reposts</h3>
        <p className="leading-relaxed">
          Text that credits a source is not a clone, and the credit removes the clone weight. Explicit credit is{" "}
          <span className="font-mono">via @handle</span>, <span className="font-mono">Source: @handle</span>, or{" "}
          <span className="font-mono">h/t</span>. Attributed syndication is <span className="font-mono">per</span>,{" "}
          <span className="font-mono">via</span>, <span className="font-mono">Source:</span>, or{" "}
          <span className="font-mono">출처:</span> plus an outlet name, including <span className="font-mono">per Reuters</span>{" "}
          and <span className="font-mono">via Unusual Whales</span>. Those posts stay visible as Attributed or Syndicated
          and weigh {THRESHOLDS.cloneAttributedWeight}. A quote post is not credit by itself. Ordinary phrases such as
          “via the market” or “per share” are not credits. A repost stored as <span className="font-mono">RT @</span>{" "}
          uses action <span className="font-mono">repost</span> and is left out of copy matching.
        </p>
        <h3 className="font-serif text-xl">Syndicated wires</h3>
        <p className="leading-relaxed">
          When two or more verified major outlets share a headline, that text is one cluster. The earliest poster is
          the originator. The other outlets in the set are Syndicated, with copy weight 0. They are not clones of each
          other. An account outside the set that pastes the same headline without a credit is still a copy. A single
          outlet copying a non-outlet, with no second outlet in the cluster, is still a copy. When the text names a
          source that is not in the corpus, or names a corpus account that did not post in the cluster, the cluster is
          marked source outside corpus. The first in-corpus poster is not crowned Originator, and those posts are not
          scored as clones of each other.
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          {WIRE_OUTLETS.map((outlet) => (
            <li key={outlet.handle}>
              @{outlet.handle}
              {outlet.name === outlet.handle ? "" : ` · ${outlet.name}`}
            </li>
          ))}
        </ul>
        <h3 className="font-serif text-xl">Minimum sample</h3>
        <p className="leading-relaxed">
          Every account is scored on one window, {SCORE_WINDOW.start} through {SCORE_WINDOW.end}, measured at{" "}
          {formatStamp(AGE_AS_OF)}. Posts outside that window do not count. Most original and Biggest copycats include
          accounts with at least {THRESHOLDS.leaderboardMinPosts} posts in the window. Fewer posts is a thin sample:
          the grade line reads “thin sample / not graded yet” and no GC percent is shown. The lanes omit that account.
          The copy and amplifier signals can still be read underneath. A withheld organic-reach meter is a separate
          “Not graded yet,” for a boost pattern that did not clear its own gate.
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
          <li>The corpus is a snapshot of real public posts as of 18 Oct 2026. It is not a complete or live sample of any timeline.</li>
          <li>Nothing here is investment advice, a harassment list, or a grade for sale.</li>
        </ul>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">How to dispute</h2>
        <p className="leading-relaxed">
          A skeptic should be able to re-run the text. Paste the post, read the hash, and compare it with the cluster
          diff. Check these before treating the label as final: whether the match is your own earlier post, whether you
          were the earliest account in the cluster, whether the text credits a source with via, per, Source:, or 출처:,
          whether the named source sits outside the corpus, whether both accounts are on the wire list above, and
          whether a lone template match is the only evidence. If the grade line says thin sample, count the posts in
          the {SCORE_WINDOW.start}–{SCORE_WINDOW.end} window against the {THRESHOLDS.leaderboardMinPosts}-post minimum.
        </p>
        <p className="leading-relaxed">
          If the label is still wrong, the review queue for a solo operator is manual: one draft, one person, no
          vendor account required for this demo. Copy the draft and keep it with the post you want re-read. This page
          does not send email or open a ticket.
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

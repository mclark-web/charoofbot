import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-ink-soft md:px-8">
        <p>
          GCBot is a GradedCalls product. Synthetic posts and a paste bench. No live firehose, no API key, no paid
          database. Grades are not for sale and are not investment advice.
        </p>
        <p>
          <Link href="/methodology" className="underline decoration-rule underline-offset-4 hover:decoration-ink">
            Read the methodology
          </Link>{" "}
          before treating a label as a finding.
        </p>
      </div>
    </footer>
  );
}

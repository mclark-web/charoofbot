import type { Metadata } from "next";
import Link from "next/link";
import { HUB_HREF } from "@/components/logo-link";

export const metadata: Metadata = {
  title: { absolute: "Page not found · GCBot" },
};

export default function NotFound() {
  return (
    <div className="max-w-xl">
      <p className="kicker">404</p>
      <h1 className="mt-2 font-serif text-4xl text-ink">That page is not in the notebook.</h1>
      <p className="mt-4 text-ink-soft">
        <Link href="/" className="tap underline decoration-rule underline-offset-4">
          Return to the dashboard
        </Link>
        .
      </p>
      <p className="mt-6 text-ink-soft">
        <a href={HUB_HREF} className="tap underline decoration-rule underline-offset-4">
          Back to the Hub
        </a>
      </p>
    </div>
  );
}

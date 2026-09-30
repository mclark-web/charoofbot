"use client";

import { useEffect } from "react";
import { LogoLink } from "@/components/logo-link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-xl">
      <LogoLink />
      <p className="kicker mt-6">Error</p>
      <h1 className="mt-2 font-serif text-4xl text-ink">This page failed to render.</h1>
      <p className="mt-4 text-ink-soft">The notebook hit an error while loading this view.</p>
      <button type="button" className="btn btn-primary mt-6" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
